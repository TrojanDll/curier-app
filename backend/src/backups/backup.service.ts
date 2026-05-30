import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import archiver from 'archiver';
import { randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, type ReadStream } from 'node:fs';
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import StreamZip from 'node-stream-zip';
import { PrismaService } from '../prisma/prisma.service';
import {
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLES,
  type BackupCounts,
  type BackupManifest,
  type BackupMeta,
  type BackupOrigin,
  type BackupTable,
  type RestoreResult,
} from './backup.types';

/** A single regular file discovered while walking the uploads tree. */
interface WalkedFile {
  abs: string;
  /** POSIX-style path relative to the uploads root (always `/`-separated). */
  rel: string;
  size: number;
}

/**
 * Date columns per table — used to revive ISO strings back into `Date` on
 * restore (JSON has no date type). `orders.price` is a Decimal, handled
 * separately (kept as a string, which Prisma accepts for Decimal inputs).
 */
const DATE_FIELDS: Record<BackupTable, readonly string[]> = {
  admins: ['createdAt', 'lastLoginAt'],
  couriers: [
    'dateOfBirth',
    'lastReturnedAt',
    'pausedAt',
    'lastResumedAt',
    'firedAt',
    'createdAt',
    'updatedAt',
  ],
  orders: [
    'createdAt',
    'assignedAt',
    'pickedUpAt',
    'nearCustomerAt',
    'deliveredAt',
    'returnedAt',
  ],
  order_photos: ['uploadedAt', 'expiresAt'],
  app_settings: ['updatedAt'],
};

const ID_RE = /^\d{8}-\d{6}-[0-9a-f]{6}$/;
const UPLOADS_PREFIX = 'uploads/';

/**
 * App-level backup/restore. Snapshots every business table (via Prisma) plus
 * the courier photo files into one portable ZIP, kept in `BACKUP_DIR`. No
 * `pg_dump` dependency — the same code path works in dev (Windows) and the
 * Alpine production image. See docs/backups.md.
 *
 * Mutating operations (create / restore / import) take a process-local lock so
 * two of them can never interleave on the single-instance backend (§16).
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly uploadDir: string;
  private readonly stackVersion: string;
  /** Non-null while a mutating op runs — name is surfaced in the 409 message. */
  private busy: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.backupDir = resolveDir(
      config.get<string>('BACKUP_DIR') ?? './backups',
    );
    this.uploadDir = resolveDir(
      config.get<string>('PHOTO_UPLOAD_DIR') ?? './uploads',
    );
    this.stackVersion = config.get<string>('STACK_VERSION') ?? 'dev';
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** History, newest first. Metas whose archive went missing are skipped. */
  async list(): Promise<BackupMeta[]> {
    await this.ensureDir();
    const names = await readdir(this.backupDir).catch(() => [] as string[]);
    const metas: BackupMeta[] = [];
    for (const name of names) {
      if (!name.endsWith('.meta.json')) continue;
      try {
        const raw = await readFile(join(this.backupDir, name), 'utf8');
        const meta = JSON.parse(raw) as BackupMeta;
        const exists = await fileExists(join(this.backupDir, meta.fileName));
        if (!exists) {
          this.logger.warn(`Backup archive missing for ${meta.id}, skipping`);
          continue;
        }
        metas.push(meta);
      } catch (e) {
        this.logger.warn(`Unreadable backup meta ${name}: ${String(e)}`);
      }
    }
    metas.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return metas;
  }

  /** Create a backup of the current state. `adminId` → resolves `createdBy`. */
  async create(adminId: string, note?: string | null): Promise<BackupMeta> {
    this.acquire('create');
    try {
      const createdBy = await this.resolveUsername(adminId);
      return await this.snapshot('manual', note ?? null, createdBy);
    } finally {
      this.release();
    }
  }

  /** Open a read stream of an archive for download/export. */
  async openDownload(
    id: string,
  ): Promise<{ stream: ReadStream; fileName: string; size: number }> {
    const meta = await this.requireMeta(id);
    const zipPath = join(this.backupDir, meta.fileName);
    if (!(await fileExists(zipPath))) {
      throw new NotFoundException('Backup archive not found');
    }
    return {
      stream: createReadStream(zipPath),
      fileName: `curier-backup-${id}.zip`,
      size: meta.sizeBytes,
    };
  }

  /** Delete an archive + its sidecar from history. */
  async remove(id: string): Promise<void> {
    const meta = await this.requireMeta(id);
    await unlink(join(this.backupDir, meta.fileName)).catch(() => undefined);
    await unlink(this.metaPath(id)).catch(() => undefined);
  }

  /**
   * Restore the DB + photos from a backup. Destructive: every business table is
   * wiped and reloaded, all sessions are revoked, and the uploads directory is
   * replaced. A `pre-restore` safety snapshot is taken first so the operation
   * can be undone.
   */
  async restore(id: string): Promise<RestoreResult> {
    this.acquire('restore');
    try {
      const meta = await this.requireMeta(id);
      const zipPath = join(this.backupDir, meta.fileName);
      if (!(await fileExists(zipPath))) {
        throw new NotFoundException('Backup archive not found');
      }

      // 1. Safety snapshot of the CURRENT state (so the operator can roll back).
      const safety = await this.snapshot(
        'pre-restore',
        `Автоснимок перед восстановлением из ${id}`,
        'system',
      );

      // 2. Read + validate archive contents into memory.
      const { tables, photoEntries } = await this.readArchive(zipPath);

      // 3. Swap the DB atomically (children deleted first, parents inserted first).
      await this.prisma.$transaction(
        async (tx) => {
          await tx.orderPhoto.deleteMany();
          await tx.order.deleteMany();
          await tx.refreshToken.deleteMany();
          await tx.courier.deleteMany();
          await tx.admin.deleteMany();
          await tx.appSettings.deleteMany();

          await createTableRows(tx, 'admins', tables.admins);
          await createTableRows(tx, 'couriers', tables.couriers);
          await createTableRows(tx, 'orders', tables.orders);
          await createTableRows(tx, 'order_photos', tables.order_photos);
          await createTableRows(tx, 'app_settings', tables.app_settings);
        },
        { timeout: 120_000, maxWait: 15_000 },
      );

      // 4. Replace photo files (best-effort — a partial photo restore is a
      //    missing-image UX issue, not a data-integrity one).
      await this.restorePhotos(zipPath, photoEntries);

      const counts = countRows(tables);
      this.logger.log(
        `Restored from ${id} (safety snapshot ${safety.id}): ` +
          `${counts.admins} admins, ${counts.couriers} couriers, ` +
          `${counts.orders} orders, ${counts.orderPhotos} photos`,
      );
      return {
        restored: true,
        restoredFrom: id,
        safetySnapshotId: safety.id,
        counts,
      };
    } finally {
      this.release();
    }
  }

  /**
   * Import an externally-produced backup ZIP (already saved to `tmpFilePath` by
   * multer). Validates the manifest, then files it into history as `imported`.
   */
  async importArchive(
    tmpFilePath: string,
    adminId: string,
  ): Promise<BackupMeta> {
    this.acquire('import');
    try {
      const manifest = await this.validateArchive(tmpFilePath);

      await this.ensureDir();
      const now = new Date();
      const id = newId(now);
      const fileName = `${id}.zip`;
      const dest = join(this.backupDir, fileName);
      // copy+unlink (not rename) — multer's temp dir may be on another volume.
      await copyFile(tmpFilePath, dest);
      const size = (await stat(dest)).size;

      const createdBy = await this.resolveUsername(adminId);
      const meta: BackupMeta = {
        id,
        fileName,
        createdAt: now.toISOString(),
        contentCreatedAt: manifest.createdAt,
        sizeBytes: size,
        formatVersion: manifest.formatVersion,
        stackVersion: manifest.stackVersion,
        counts: manifest.counts,
        photoCount: manifest.photoCount,
        photoBytes: manifest.photoBytes,
        origin: 'imported',
        createdBy,
        note: 'Импортирован',
      };
      await this.writeMeta(meta);
      this.logger.log(`Imported backup ${id} (${size} bytes)`);
      return meta;
    } finally {
      this.release();
      await unlink(tmpFilePath).catch(() => undefined);
    }
  }

  // ── Snapshot (shared by create + restore safety) ──────────────────────────

  /** Lock-free core of "produce a backup of the current state". */
  private async snapshot(
    origin: BackupOrigin,
    note: string | null,
    createdBy: string | null,
  ): Promise<BackupMeta> {
    await this.ensureDir();
    const now = new Date();
    const id = newId(now);
    const fileName = `${id}.zip`;
    const finalPath = join(this.backupDir, fileName);
    const tmpPath = `${finalPath}.tmp`;

    const dump = await this.dumpTables();
    const counts = countRows(dump);
    const photos = await walkFiles(this.uploadDir);
    const photoBytes = photos.reduce((sum, f) => sum + f.size, 0);

    const manifest: BackupManifest = {
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: now.toISOString(),
      stackVersion: this.stackVersion,
      counts,
      photoCount: photos.length,
      photoBytes,
      tables: [...BACKUP_TABLES],
    };

    await this.writeZip(tmpPath, manifest, dump, photos);
    await rename(tmpPath, finalPath);
    const size = (await stat(finalPath)).size;

    const meta: BackupMeta = {
      id,
      fileName,
      createdAt: now.toISOString(),
      contentCreatedAt: manifest.createdAt,
      sizeBytes: size,
      formatVersion: manifest.formatVersion,
      stackVersion: manifest.stackVersion,
      counts,
      photoCount: manifest.photoCount,
      photoBytes: manifest.photoBytes,
      origin,
      createdBy,
      note,
    };
    await this.writeMeta(meta);
    this.logger.log(
      `Created backup ${id} (${origin}, ${size} bytes, ${photos.length} photos)`,
    );
    return meta;
  }

  private async dumpTables(): Promise<Record<BackupTable, unknown[]>> {
    const [admins, couriers, orders, orderPhotos, appSettings] =
      await Promise.all([
        this.prisma.admin.findMany(),
        this.prisma.courier.findMany(),
        this.prisma.order.findMany(),
        this.prisma.orderPhoto.findMany(),
        this.prisma.appSettings.findMany(),
      ]);
    return {
      admins,
      couriers,
      // Decimal → string so JSON round-trips exactly (no float precision loss).
      orders: orders.map((o) => ({
        ...o,
        price: o.price === null ? null : o.price.toString(),
      })),
      order_photos: orderPhotos,
      app_settings: appSettings,
    };
  }

  private writeZip(
    tmpPath: string,
    manifest: BackupManifest,
    dump: Record<BackupTable, unknown[]>,
    photos: WalkedFile[],
  ): Promise<void> {
    return new Promise<void>((resolvePromise, reject) => {
      const output = createWriteStream(tmpPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => resolvePromise());
      output.on('error', reject);
      archive.on('error', reject);
      archive.on('warning', (err) => {
        // ENOENT = a photo vanished mid-archive (TTL cleanup race) — tolerable.
        if (err.code === 'ENOENT') {
          this.logger.warn(`Archive warning: ${err.message}`);
        } else {
          reject(err);
        }
      });

      archive.pipe(output);
      archive.append(JSON.stringify(manifest), { name: 'manifest.json' });
      for (const table of BACKUP_TABLES) {
        archive.append(JSON.stringify(dump[table]), {
          name: `data/${table}.json`,
        });
      }
      for (const photo of photos) {
        archive.file(photo.abs, { name: `${UPLOADS_PREFIX}${photo.rel}` });
      }
      void archive.finalize();
    });
  }

  // ── Archive reading (restore + import) ─────────────────────────────────────

  /** Read + parse every data table and list photo entries from an archive. */
  private async readArchive(zipPath: string): Promise<{
    tables: Record<BackupTable, Record<string, unknown>[]>;
    photoEntries: string[];
  }> {
    const zip = new StreamZip.async({ file: zipPath });
    try {
      const entries = await zip.entries();
      const manifestBuf = await readEntry(zip, entries, 'manifest.json');
      const manifest = parseManifest(manifestBuf);
      assertCompatible(manifest);

      const tables = {} as Record<BackupTable, Record<string, unknown>[]>;
      for (const table of BACKUP_TABLES) {
        const buf = await readEntry(zip, entries, `data/${table}.json`);
        const rows = JSON.parse(buf.toString('utf8')) as unknown;
        if (!Array.isArray(rows)) {
          throw new BadRequestException(`Повреждён бэкап: data/${table}.json`);
        }
        tables[table] = rows as Record<string, unknown>[];
      }

      const photoEntries = Object.keys(entries).filter(
        (name) =>
          name.startsWith(UPLOADS_PREFIX) && !entries[name]?.isDirectory,
      );
      return { tables, photoEntries };
    } finally {
      await zip.close();
    }
  }

  /** Validate that a file is a well-formed backup; returns its manifest. */
  private async validateArchive(zipPath: string): Promise<BackupManifest> {
    let zip: StreamZip.StreamZipAsync;
    try {
      zip = new StreamZip.async({ file: zipPath });
    } catch {
      throw new BadRequestException('Файл не является ZIP-архивом');
    }
    try {
      const entries = await zip.entries();
      const manifestBuf = await readEntry(zip, entries, 'manifest.json');
      const manifest = parseManifest(manifestBuf);
      assertCompatible(manifest);
      for (const table of BACKUP_TABLES) {
        if (!entries[`data/${table}.json`]) {
          throw new BadRequestException(
            `Повреждён бэкап: отсутствует data/${table}.json`,
          );
        }
      }
      return manifest;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Не удалось прочитать архив бэкапа');
    } finally {
      await zip.close().catch(() => undefined);
    }
  }

  /** Replace uploads dir contents with the archive's photos (zip-slip safe). */
  private async restorePhotos(
    zipPath: string,
    photoEntries: string[],
  ): Promise<void> {
    await this.clearDirContents(this.uploadDir);
    if (photoEntries.length === 0) return;

    const root = resolve(this.uploadDir);
    const zip = new StreamZip.async({ file: zipPath });
    try {
      for (const name of photoEntries) {
        const rel = name.slice(UPLOADS_PREFIX.length);
        if (rel.length === 0) continue;
        const dest = resolve(root, rel);
        // Reject any entry that escapes the uploads root (zip-slip).
        if (dest !== root && !dest.startsWith(root + sep)) {
          this.logger.warn(`Skipping unsafe archive entry: ${name}`);
          continue;
        }
        await mkdir(dirname(dest), { recursive: true });
        const data = await zip.entryData(name);
        await writeFile(dest, data);
      }
    } finally {
      await zip.close();
    }
  }

  // ── Filesystem helpers ─────────────────────────────────────────────────────

  private async ensureDir(): Promise<void> {
    await mkdir(this.backupDir, { recursive: true });
  }

  private metaPath(id: string): string {
    return join(this.backupDir, `${id}.meta.json`);
  }

  private async writeMeta(meta: BackupMeta): Promise<void> {
    await writeFile(
      this.metaPath(meta.id),
      JSON.stringify(meta, null, 2),
      'utf8',
    );
  }

  private async requireMeta(id: string): Promise<BackupMeta> {
    assertValidId(id);
    try {
      const raw = await readFile(this.metaPath(id), 'utf8');
      return JSON.parse(raw) as BackupMeta;
    } catch {
      throw new NotFoundException('Backup not found');
    }
  }

  private async clearDirContents(dir: string): Promise<void> {
    const entries = await readdir(dir).catch(() => [] as string[]);
    await Promise.all(
      entries.map((e) => rm(join(dir, e), { recursive: true, force: true })),
    );
  }

  private async resolveUsername(adminId: string): Promise<string | null> {
    const admin = await this.prisma.admin
      .findUnique({ where: { id: adminId }, select: { username: true } })
      .catch(() => null);
    return admin?.username ?? null;
  }

  // ── Lock ───────────────────────────────────────────────────────────────────

  private acquire(op: string): void {
    if (this.busy) {
      throw new ConflictException(
        `Операция бэкапа уже выполняется (${this.busy}). Дождитесь завершения.`,
      );
    }
    this.busy = op;
  }

  private release(): void {
    this.busy = null;
  }
}

// ── Module-private helpers ─────────────────────────────────────────────────────

function resolveDir(raw: string): string {
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

function newId(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  const ts =
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  return `${ts}-${randomBytes(3).toString('hex')}`;
}

function assertValidId(id: string): void {
  if (!ID_RE.test(id)) {
    throw new BadRequestException('Некорректный идентификатор бэкапа');
  }
}

function countRows(tables: Record<BackupTable, unknown[]>): BackupCounts {
  return {
    admins: tables.admins.length,
    couriers: tables.couriers.length,
    orders: tables.orders.length,
    orderPhotos: tables.order_photos.length,
    appSettings: tables.app_settings.length,
  };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Recursively list regular files under `root`, with POSIX-relative paths. */
async function walkFiles(root: string, rel = ''): Promise<WalkedFile[]> {
  const dir = rel ? join(root, ...rel.split('/')) : root;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => null);
  if (!entries) return [];
  const out: WalkedFile[] = [];
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(root, childRel)));
    } else if (entry.isFile()) {
      const abs = join(root, ...childRel.split('/'));
      const { size } = await stat(abs);
      out.push({ abs, rel: childRel, size });
    }
  }
  return out;
}

async function readEntry(
  zip: StreamZip.StreamZipAsync,
  entries: Record<string, StreamZip.ZipEntry>,
  name: string,
): Promise<Buffer> {
  if (!entries[name]) {
    throw new BadRequestException(`Повреждён бэкап: отсутствует ${name}`);
  }
  return zip.entryData(name);
}

function parseManifest(buf: Buffer): BackupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(buf.toString('utf8'));
  } catch {
    throw new BadRequestException('Повреждён бэкап: нечитаемый manifest.json');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new BadRequestException('Повреждён бэкап: неверный manifest.json');
  }
  return parsed as BackupManifest;
}

function assertCompatible(manifest: BackupManifest): void {
  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new BadRequestException(
      `Несовместимая версия формата бэкапа: ${manifest.formatVersion} ` +
        `(поддерживается ${BACKUP_FORMAT_VERSION})`,
    );
  }
}

/**
 * Revive date strings → `Date` and bulk-insert a table's rows inside the
 * restore transaction. The cast is unavoidable for a table-generic helper;
 * the data originates from our own dump so the shape matches the model.
 */
async function createTableRows(
  tx: Prisma.TransactionClient,
  table: BackupTable,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  const dateFields = DATE_FIELDS[table];
  const revived = rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const field of dateFields) {
      const value = next[field];
      if (typeof value === 'string') next[field] = new Date(value);
    }
    return next;
  });

  switch (table) {
    case 'admins':
      await tx.admin.createMany({
        data: revived as unknown as Prisma.AdminCreateManyInput[],
      });
      break;
    case 'couriers':
      await tx.courier.createMany({
        data: revived as unknown as Prisma.CourierCreateManyInput[],
      });
      break;
    case 'orders':
      await tx.order.createMany({
        data: revived as unknown as Prisma.OrderCreateManyInput[],
      });
      break;
    case 'order_photos':
      await tx.orderPhoto.createMany({
        data: revived as unknown as Prisma.OrderPhotoCreateManyInput[],
      });
      break;
    case 'app_settings':
      await tx.appSettings.createMany({
        data: revived as unknown as Prisma.AppSettingsCreateManyInput[],
      });
      break;
  }
}

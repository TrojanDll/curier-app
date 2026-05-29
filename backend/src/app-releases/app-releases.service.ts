import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppRelease } from '@prisma/client';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAppReleaseDto } from './dto/create-app-release.dto';

/** Wire-shape for release metadata (admin list + public latest). */
export interface AppReleaseMeta {
  id: string;
  versionCode: number;
  versionName: string;
  releaseNotes: string | null;
  fileSize: number;
  sha256: string;
  isMandatory: boolean;
  gitCommit: string | null;
  /** Relative path the client appends to its base URL to fetch the APK. */
  downloadUrl: string;
  createdAt: string;
}

@Injectable()
export class AppReleasesService {
  private readonly logger = new Logger(AppReleasesService.name);
  private readonly uploadDir: string;
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const rawDir = config.get<string>('APK_UPLOAD_DIR') ?? './uploads/apk';
    this.uploadDir = isAbsolute(rawDir)
      ? rawDir
      : resolve(process.cwd(), rawDir);
    this.maxBytes =
      Number(config.get<string>('APK_MAX_SIZE_MB') ?? '200') * 1024 * 1024;
  }

  /** Bytes ceiling exposed to the controller's multer config. */
  getMaxBytes(): number {
    return this.maxBytes;
  }

  /**
   * Persist a new release: validate, hash, insert row, write file, patch path.
   * Mirrors PhotosService.uploadForCourier — pre-create the row to claim an id
   * before touching disk, roll back on a write failure.
   */
  async createRelease(
    dto: CreateAppReleaseDto,
    buffer: Buffer,
  ): Promise<AppReleaseMeta> {
    if (buffer.byteLength === 0) {
      throw new BadRequestException('APK file is empty');
    }
    if (buffer.byteLength > this.maxBytes) {
      throw new BadRequestException(`APK exceeds ${this.maxBytes} bytes`);
    }
    // An APK is a ZIP archive — sanity-check the "PK" magic bytes.
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new BadRequestException(
        'File does not look like an APK (bad signature)',
      );
    }

    const existing = await this.prisma.appRelease.findUnique({
      where: { versionCode: dto.versionCode },
    });
    if (existing) {
      throw new BadRequestException(
        `versionCode ${dto.versionCode} already exists`,
      );
    }

    const sha256 = createHash('sha256').update(buffer).digest('hex');

    const placeholder = await this.prisma.appRelease.create({
      data: {
        versionCode: dto.versionCode,
        versionName: dto.versionName,
        releaseNotes: dto.releaseNotes ?? null,
        isMandatory: dto.isMandatory ?? false,
        gitCommit: dto.gitCommit ?? null,
        filePath: '',
        fileSize: buffer.byteLength,
        sha256,
      },
    });
    const filePath = `${placeholder.id}.apk`;
    const absPath = join(this.uploadDir, filePath);

    try {
      await mkdir(this.uploadDir, { recursive: true });
      await writeFile(absPath, buffer);
    } catch (e) {
      this.logger.error(
        `Failed to write APK ${placeholder.id} → ${absPath}`,
        e instanceof Error ? e.stack : String(e),
      );
      await this.prisma.appRelease.delete({ where: { id: placeholder.id } });
      void unlink(absPath).catch(() => undefined);
      throw new InternalServerErrorException('Failed to persist APK');
    }

    const updated = await this.prisma.appRelease.update({
      where: { id: placeholder.id },
      data: { filePath },
    });
    return toMeta(updated);
  }

  /** Newest published release, or null if none exists yet. */
  async getLatest(): Promise<AppReleaseMeta | null> {
    const row = await this.prisma.appRelease.findFirst({
      orderBy: { versionCode: 'desc' },
    });
    return row ? toMeta(row) : null;
  }

  /** All releases, newest first (admin list). */
  async list(): Promise<AppReleaseMeta[]> {
    const rows = await this.prisma.appRelease.findMany({
      orderBy: { versionCode: 'desc' },
    });
    return rows.map(toMeta);
  }

  /** Open a readable stream of the APK file for a given versionCode. */
  async loadStream(
    versionCode: number,
  ): Promise<{ file: StreamableFile; fileName: string }> {
    const row = await this.prisma.appRelease.findUnique({
      where: { versionCode },
    });
    if (!row || !row.filePath) {
      throw new NotFoundException('Release not found');
    }
    const absPath = join(this.uploadDir, row.filePath);
    const stream = createReadStream(absPath);
    stream.on('error', (err) => {
      this.logger.error(
        `Read failed for APK ${row.id} (${absPath})`,
        err.stack,
      );
    });
    return {
      file: new StreamableFile(stream),
      fileName: `curier-${row.versionName}.apk`,
    };
  }

  /** Delete a release row + its file (best-effort unlink). */
  async remove(id: string): Promise<void> {
    const row = await this.prisma.appRelease.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Release not found');
    }
    await this.prisma.appRelease.delete({ where: { id } });
    if (row.filePath) {
      void unlink(join(this.uploadDir, row.filePath)).catch(() => undefined);
    }
  }
}

function toMeta(r: AppRelease): AppReleaseMeta {
  return {
    id: r.id,
    versionCode: r.versionCode,
    versionName: r.versionName,
    releaseNotes: r.releaseNotes,
    fileSize: r.fileSize,
    sha256: r.sha256,
    isMandatory: r.isMandatory,
    gitCommit: r.gitCommit,
    downloadUrl: `/api/app/download/${r.versionCode}`,
    createdAt: r.createdAt.toISOString(),
  };
}

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OrderPhoto } from '@prisma/client';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SettingsService } from '../settings/settings.service';

/** Wire-shape for embedding photo metadata in order detail responses. */
export interface PhotoMeta {
  id: string;
  uploadedAt: string;
  expiresAt: string;
}

/** Returned by `loadStream*` so the controller can stream + set Content-Type. */
export interface PhotoStream {
  file: StreamableFile;
  mimeType: string;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png'] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

/** ext written into filePath, derived from MIME — keeps `<id>.<ext>` predictable. */
const MIME_TO_EXT: Record<AllowedMime, 'jpg' | 'png'> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** ext → MIME on the way back out (path is the only thing we trust on disk). */
const EXT_TO_MIME: Record<'jpg' | 'png', AllowedMime> = {
  jpg: 'image/jpeg',
  png: 'image/png',
};

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);
  private readonly uploadDir: string;
  private readonly maxBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly realtime: RealtimeGateway,
    config: ConfigService,
  ) {
    const rawDir = config.get<string>('PHOTO_UPLOAD_DIR') ?? './uploads';
    this.uploadDir = isAbsolute(rawDir)
      ? rawDir
      : resolve(process.cwd(), rawDir);
    // PHOTO_TTL_DAYS env is consumed only by SettingsService on first-run
    // bootstrap. Live TTL comes from app_settings — see uploadForCourier.
    this.maxBytes =
      Number(config.get<string>('PHOTO_MAX_SIZE_MB') ?? '10') * 1024 * 1024;
  }

  /** Bytes ceiling exposed to the controller's multer config. */
  getMaxBytes(): number {
    return this.maxBytes;
  }

  /**
   * Upload a photo for an order owned by `courierId`.
   *
   * Order:
   *   1. Verify order exists AND belongs to this courier (else 404 — same
   *      "hide existence" rule as orders.findOneCourier).
   *   2. Validate MIME + size.
   *   3. Insert OrderPhoto row to claim an id + expiresAt.
   *   4. Write the buffer to disk under `<uploadDir>/<orderId>/<id>.<ext>`.
   *   5. If the disk write throws, delete the row + best-effort unlink so we
   *      never leave a half-state where the DB references a missing file.
   */
  async uploadForCourier(
    courierId: string,
    orderId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<PhotoMeta> {
    if (!isAllowedMime(mimeType)) {
      throw new BadRequestException(
        'Only image/jpeg and image/png are allowed',
      );
    }
    if (buffer.byteLength === 0) {
      throw new BadRequestException('Photo file is empty');
    }
    if (buffer.byteLength > this.maxBytes) {
      throw new BadRequestException(`Photo exceeds ${this.maxBytes} bytes`);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, courierId: true },
    });
    if (!order || order.courierId !== courierId) {
      throw new NotFoundException('Order not found');
    }

    const ext = MIME_TO_EXT[mimeType];
    const uploadedAt = new Date();
    // Pull TTL at upload time — admin edits via PATCH /admin/settings take
    // effect on the next upload. Already-stored rows keep their stamped
    // expires_at; intentional, so changing TTL doesn't retroactively erase
    // photos that admins committed to keeping.
    const ttlDays = await this.settings.getPhotoTtlDays();
    const expiresAt = new Date(
      uploadedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000,
    );

    // Pre-allocate the row so we know the photo id before touching disk.
    // filePath is generated from server-side ids only — no traversal possible.
    const placeholder = await this.prisma.orderPhoto.create({
      data: {
        orderId,
        // Temporary marker — overwritten in the same tx after we know the id.
        filePath: '',
        uploadedAt,
        expiresAt,
      },
    });
    const filePath = `${orderId}/${placeholder.id}.${ext}`;
    const absPath = join(this.uploadDir, filePath);

    try {
      await mkdir(join(this.uploadDir, orderId), { recursive: true });
      await writeFile(absPath, buffer);
    } catch (e) {
      this.logger.error(
        `Failed to write photo ${placeholder.id} → ${absPath}`,
        e instanceof Error ? e.stack : String(e),
      );
      await this.prisma.orderPhoto.delete({
        where: { id: placeholder.id },
      });
      // Best-effort cleanup of any partial bytes left behind.
      void unlink(absPath).catch(() => undefined);
      throw new InternalServerErrorException('Failed to persist photo');
    }

    const updated = await this.prisma.orderPhoto.update({
      where: { id: placeholder.id },
      data: { filePath },
    });

    // Любая открытая в admin drawer-е карточка заказа подписана на
    // `orders:updated` через RealtimeProvider (см. docs/admin-realtime.md).
    // Без этого emit-а админ продолжит видеть "Фото ещё не загружено" даже
    // после успешной загрузки — пока вручную не переоткроет drawer. Фетчим
    // запись отдельно: insert/update photo выше работал в неблокирующем
    // относительно order стиле, лишних join-ов нет.
    const orderRow = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (orderRow) {
      this.realtime.emitOrderUpdated(orderRow);
    }

    return toMeta(updated);
  }

  /** GET handler for admin: any photo that exists is returned. */
  async loadStreamForAdmin(
    orderId: string,
    photoId: string,
  ): Promise<PhotoStream> {
    const photo = await this.prisma.orderPhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo || photo.orderId !== orderId) {
      throw new NotFoundException('Photo not found');
    }
    return this.openStream(photo);
  }

  /** GET handler for courier: photo must belong to one of their orders. */
  async loadStreamForCourier(
    courierId: string,
    orderId: string,
    photoId: string,
  ): Promise<PhotoStream> {
    const photo = await this.prisma.orderPhoto.findUnique({
      where: { id: photoId },
      include: { order: { select: { id: true, courierId: true } } },
    });
    if (
      !photo ||
      photo.orderId !== orderId ||
      photo.order.courierId !== courierId
    ) {
      throw new NotFoundException('Photo not found');
    }
    return this.openStream(photo);
  }

  /**
   * Photo metadata embedded into order detail responses (admin + courier).
   * Used by `OrdersService.findOneAdmin` / `findOneCourier`. List endpoints
   * intentionally pass `[]` to keep the query light.
   */
  async listForOrder(orderId: string): Promise<PhotoMeta[]> {
    const rows = await this.prisma.orderPhoto.findMany({
      where: { orderId },
      orderBy: { uploadedAt: 'asc' },
    });
    return rows.map(toMeta);
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private openStream(photo: OrderPhoto): PhotoStream {
    const ext = extFromPath(photo.filePath);
    if (!ext) {
      // The file_path was generated by us; this should never happen unless
      // someone hand-edited the DB. 500 is correct.
      this.logger.error(
        `Photo ${photo.id} has unsupported extension in path: ${photo.filePath}`,
      );
      throw new InternalServerErrorException('Photo unreadable');
    }
    const absPath = join(this.uploadDir, photo.filePath);
    const stream = createReadStream(absPath);
    stream.on('error', (err) => {
      this.logger.error(
        `Read failed for photo ${photo.id} (${absPath})`,
        err.stack,
      );
    });
    return {
      file: new StreamableFile(stream),
      mimeType: EXT_TO_MIME[ext],
    };
  }
}

// ── Module-private helpers ───────────────────────────────────────────────────

function toMeta(p: OrderPhoto): PhotoMeta {
  return {
    id: p.id,
    uploadedAt: p.uploadedAt.toISOString(),
    expiresAt: p.expiresAt.toISOString(),
  };
}

function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

function extFromPath(filePath: string): 'jpg' | 'png' | null {
  const dot = filePath.lastIndexOf('.');
  if (dot < 0) return null;
  const ext = filePath.slice(dot + 1).toLowerCase();
  if (ext === 'jpg' || ext === 'png') return ext;
  return null;
}

import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

/**
 * Wire-shape exposed to admin consumers (`GET /api/admin/settings`,
 * `PATCH /api/admin/settings`) and to PhotosService for runtime TTL reads.
 * Decoupled from the Prisma row so adding internal-only columns (e.g. an
 * audit field) doesn't leak through the API.
 */
export interface AppSettingsView {
  photoTtlDays: number;
  updatedAt: string;
}

/** Singleton row pkey — see schema.prisma comment. */
const SETTINGS_ID = 1;

/**
 * Bounds mirrored from `UpdateSettingsDto` so direct service callers (env
 * seed, PhotosService) cannot push an out-of-range value into the DB.
 */
const MIN_TTL_DAYS = 1;
const MAX_TTL_DAYS = 365;
const DEFAULT_TTL_DAYS = 30;

/**
 * Runtime-editable application settings (§14.3.6). Currently exposes a
 * single tunable — `photoTtlDays` — which PhotosService reads on every
 * upload. Adding new tunables: a new column in `AppSettings` + a new
 * optional field in `UpdateSettingsDto` is enough; the service is generic.
 *
 * Bootstrap behaviour:
 *  - Upserts the singleton row (id=1) on application start.
 *  - On *first* run only (row didn't exist), seeds `photoTtlDays` from
 *    the `PHOTO_TTL_DAYS` env var if present and within bounds; otherwise
 *    falls back to `DEFAULT_TTL_DAYS`. Subsequent boots never overwrite —
 *    admin edits through `PATCH` are the source of truth.
 */
@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.prisma.appSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (existing) {
      this.logger.debug(
        `Settings row present (photoTtlDays=${existing.photoTtlDays})`,
      );
      return;
    }

    const envRaw = this.config.get<string>('PHOTO_TTL_DAYS');
    const envParsed = envRaw ? Number(envRaw) : NaN;
    const seedTtl =
      Number.isInteger(envParsed) &&
      envParsed >= MIN_TTL_DAYS &&
      envParsed <= MAX_TTL_DAYS
        ? envParsed
        : DEFAULT_TTL_DAYS;

    await this.prisma.appSettings.create({
      data: { id: SETTINGS_ID, photoTtlDays: seedTtl },
    });
    this.logger.log(
      `Seeded app_settings: photoTtlDays=${seedTtl}` +
        (envRaw ? ` (from PHOTO_TTL_DAYS=${envRaw})` : ' (default)'),
    );
  }

  /** Public DTO for `GET /api/admin/settings`. */
  async getCurrent(): Promise<AppSettingsView> {
    const row = await this.ensureRow();
    return toView(row);
  }

  /** Public DTO for `PATCH /api/admin/settings`. */
  async update(dto: UpdateSettingsDto): Promise<AppSettingsView> {
    await this.ensureRow();
    const updated = await this.prisma.appSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...(dto.photoTtlDays !== undefined
          ? { photoTtlDays: dto.photoTtlDays }
          : {}),
      },
    });
    return toView(updated);
  }

  /**
   * Hot read for PhotosService — kept as a single round-trip instead of
   * caching because Postgres scans a one-row primary-key lookup in
   * microseconds, and we want admin edits to take effect immediately on
   * the very next upload without a stale window.
   */
  async getPhotoTtlDays(): Promise<number> {
    const row = await this.ensureRow();
    return row.photoTtlDays;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  /**
   * Re-runs the bootstrap upsert as a defensive guard — in practice the row
   * is created on `onApplicationBootstrap`, but tests / standalone contexts
   * may instantiate this service without the bootstrap hook firing.
   */
  private async ensureRow() {
    const existing = await this.prisma.appSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    if (existing) return existing;
    return this.prisma.appSettings.create({
      data: { id: SETTINGS_ID, photoTtlDays: DEFAULT_TTL_DAYS },
    });
  }
}

function toView(row: {
  photoTtlDays: number;
  updatedAt: Date;
}): AppSettingsView {
  return {
    photoTtlDays: row.photoTtlDays,
    updatedAt: row.updatedAt.toISOString(),
  };
}

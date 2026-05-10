import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { readdir, rmdir, unlink } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

const BATCH_LIMIT = 1000;

export interface CleanupOutcome {
  scanned: number;
  rowsDeleted: number;
  filesUnlinked: number;
  unlinkErrors: number;
  emptyDirsRemoved: number;
  durationMs: number;
}

/**
 * Hourly sweeper for photos whose `expiresAt` has passed.
 *
 * Single-instance per §16, so a process-local `isRunning` flag is enough —
 * no advisory lock needed. If a previous tick is still running when the next
 * tick fires, we skip rather than overlap.
 *
 * `cleanup()` is exposed so e2e (and an eventual admin "force cleanup" button)
 * can invoke it without waiting for the cron schedule.
 */
@Injectable()
export class PhotosCleanupService {
  private readonly logger = new Logger(PhotosCleanupService.name);
  private readonly uploadDir: string;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const rawDir = config.get<string>('PHOTO_UPLOAD_DIR') ?? './uploads';
    this.uploadDir = isAbsolute(rawDir)
      ? rawDir
      : resolve(process.cwd(), rawDir);
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'photos-cleanup' })
  async runScheduled(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Skipping tick: previous cleanup is still running');
      return;
    }
    try {
      await this.cleanup();
    } catch (err) {
      this.logger.error(
        'Cleanup tick failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /**
   * Delete expired photo rows + their files.
   *
   * Order matters: unlink first, then delete the row. If unlink fails for a
   * non-ENOENT reason we keep the row so a future tick can retry — better an
   * orphan row than a row pointing at a file that still exists on disk.
   */
  async cleanup(): Promise<CleanupOutcome> {
    if (this.isRunning) {
      throw new Error('Cleanup is already running');
    }
    this.isRunning = true;
    const startedAt = Date.now();
    const outcome: CleanupOutcome = {
      scanned: 0,
      rowsDeleted: 0,
      filesUnlinked: 0,
      unlinkErrors: 0,
      emptyDirsRemoved: 0,
      durationMs: 0,
    };

    try {
      const expired = await this.prisma.orderPhoto.findMany({
        where: { expiresAt: { lt: new Date() } },
        select: { id: true, orderId: true, filePath: true },
        take: BATCH_LIMIT,
      });
      outcome.scanned = expired.length;
      if (expired.length === 0) {
        return outcome;
      }

      const deletableIds: string[] = [];
      const touchedOrderIds = new Set<string>();

      for (const photo of expired) {
        const result = await this.tryUnlink(photo.filePath);
        if (result === 'ok' || result === 'missing') {
          if (result === 'ok') outcome.filesUnlinked += 1;
          deletableIds.push(photo.id);
          touchedOrderIds.add(photo.orderId);
        } else {
          outcome.unlinkErrors += 1;
        }
      }

      if (deletableIds.length > 0) {
        const { count } = await this.prisma.orderPhoto.deleteMany({
          where: { id: { in: deletableIds } },
        });
        outcome.rowsDeleted = count;
      }

      for (const orderId of touchedOrderIds) {
        if (await this.tryRemoveEmptyOrderDir(orderId)) {
          outcome.emptyDirsRemoved += 1;
        }
      }

      this.logger.log(
        `Cleanup ok: scanned=${outcome.scanned} rowsDeleted=${outcome.rowsDeleted} filesUnlinked=${outcome.filesUnlinked} unlinkErrors=${outcome.unlinkErrors} emptyDirsRemoved=${outcome.emptyDirsRemoved}`,
      );
      return outcome;
    } finally {
      outcome.durationMs = Date.now() - startedAt;
      this.isRunning = false;
    }
  }

  private async tryUnlink(
    filePath: string,
  ): Promise<'ok' | 'missing' | 'error'> {
    if (!filePath) {
      // Placeholder rows from a half-finished upload — fine to delete the row,
      // there is nothing on disk yet.
      return 'missing';
    }
    const absPath = join(this.uploadDir, filePath);
    try {
      await unlink(absPath);
      return 'ok';
    } catch (err) {
      if (isEnoent(err)) return 'missing';
      this.logger.warn(
        `Unlink failed for ${absPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return 'error';
    }
  }

  private async tryRemoveEmptyOrderDir(orderId: string): Promise<boolean> {
    const dir = join(this.uploadDir, orderId);
    try {
      const entries = await readdir(dir);
      if (entries.length > 0) return false;
      await rmdir(dir);
      return true;
    } catch (err) {
      if (isEnoent(err)) return false;
      this.logger.warn(
        `rmdir failed for ${dir}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}

function isEnoent(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === 'ENOENT'
  );
}

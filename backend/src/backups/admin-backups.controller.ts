import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { tmpdir } from 'node:os';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/create-backup.dto';

/** Anti-DoS ceiling for an imported archive. Override with BACKUP_MAX_IMPORT_MB. */
const IMPORT_MAX_BYTES =
  Number(process.env['BACKUP_MAX_IMPORT_MB'] ?? '2048') * 1024 * 1024;

/**
 * Admin-only backup management. Mounted at `/api/admin/backups`.
 * See docs/backups.md for the archive format and restore semantics.
 *
 * Route order matters: the static `import` POST is declared before the
 * `:id/restore` param route so Nest never treats "import" as an id.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/backups')
export class AdminBackupsController {
  constructor(private readonly backups: BackupService) {}

  /** History, newest first. */
  @Get()
  list() {
    return this.backups.list();
  }

  /** Create a backup of the current state right now. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateBackupDto,
  ) {
    return this.backups.create(requireUserId(user), dto.note ?? null);
  }

  /**
   * Import a backup ZIP produced elsewhere. Field name: `file`. Stored to a
   * temp file by multer; the service validates the manifest before filing it
   * into history.
   */
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: tmpdir() }),
      limits: { fileSize: IMPORT_MAX_BYTES },
    }),
  )
  import(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Файл бэкапа обязателен (поле "file")');
    }
    return this.backups.importArchive(file.path, requireUserId(user));
  }

  /** Download / export an archive. */
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, fileName, size } = await this.backups.openDownload(id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(size));
    return new StreamableFile(stream);
  }

  /** Restore the whole stack (DB + photos) from this backup. Destructive. */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id') id: string) {
    return this.backups.restore(id);
  }

  /** Delete an archive from history. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.backups.remove(id);
  }
}

function requireUserId(user: AuthenticatedUser | undefined): string {
  if (!user) {
    throw new Error('Authenticated user missing on request');
  }
  return user.sub;
}

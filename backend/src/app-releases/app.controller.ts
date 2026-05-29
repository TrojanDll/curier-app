import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppReleasesService } from './app-releases.service';

/**
 * Публичные (без JWT) эндпоинты для Android-клиента: проверка последней версии
 * и скачивание APK. Намеренно открыты — приложение проверяет обновление при
 * старте (до логина), а APK не секрет (он и так раздаётся пользователям).
 * Mounted at /api/app.
 */
@Controller('app')
export class AppController {
  constructor(private readonly releases: AppReleasesService) {}

  @Get('latest')
  async latest(@Res({ passthrough: true }) res: Response) {
    const meta = await this.releases.getLatest();
    if (!meta) {
      // No release published yet → 204, client treats it as "no update".
      res.status(204);
      return undefined;
    }
    return meta;
  }

  @Get('download/:versionCode')
  async download(
    @Param('versionCode', ParseIntPipe) versionCode: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, fileName } = await this.releases.loadStream(versionCode);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return file;
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AppReleasesService } from './app-releases.service';
import { CreateAppReleaseDto } from './dto/create-app-release.dto';

/**
 * Admin-facing release management. Mounted at /api/admin/app-releases.
 * Upload accepts the APK as multipart field "apk" plus text metadata fields.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/app-releases')
export class AdminAppReleasesController {
  constructor(private readonly releases: AppReleasesService) {}

  @Get()
  list() {
    return this.releases.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('apk', {
      storage: memoryStorage(),
      // Static anti-DoS ceiling; the real per-env limit is checked in the
      // service from APK_MAX_SIZE_MB. MulterError → 413 via AllExceptionsFilter.
      limits: { fileSize: 300 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateAppReleaseDto,
  ) {
    if (!file) {
      throw new BadRequestException('APK file is required (field "apk")');
    }
    return this.releases.createRelease(dto, file.buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.releases.remove(id);
  }
}

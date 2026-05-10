import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { PhotosService } from './photos.service';

/**
 * Courier-facing photo endpoints. Mounted at /api/courier/orders/:id/photo*.
 *
 * The courier id always comes from the JWT (`req.user.sub`); URL/body inputs
 * cannot be used to address foreign orders or photos. Foreign access returns
 * 404 (not 403) — same "hide existence" rule as `OrdersService.findOneCourier`.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['courier'])
@Controller('courier/orders/:id/photo')
export class CourierPhotosController {
  constructor(private readonly photos: PhotosService) {}

  /**
   * Multipart upload. Field name: `photo`. MIME + size are validated inside
   * the service against env-driven limits (PHOTO_MAX_SIZE_MB) so the rule
   * tracks config without redeploying the controller. The multer-level cap
   * of 50 MB is a static anti-DoS ceiling.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) orderId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Photo file is required (field "photo")');
    }
    return this.photos.uploadForCourier(
      requireUserId(user),
      orderId,
      file.buffer,
      file.mimetype,
    );
  }

  @Get(':photoId')
  async findOne(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, mimeType } = await this.photos.loadStreamForCourier(
      requireUserId(user),
      orderId,
      photoId,
    );
    res.setHeader('Content-Type', mimeType);
    return file;
  }
}

function requireUserId(user: AuthenticatedUser | undefined): string {
  if (!user) {
    throw new Error('Authenticated user missing on request');
  }
  return user.sub;
}

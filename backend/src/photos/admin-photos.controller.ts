import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PhotosService } from './photos.service';

/**
 * Admin-facing photo endpoints. Mounted at /api/admin/orders/:id/photo/:photoId.
 *
 * Admins can fetch any order's photos. Auth is JWT-only — the browser must
 * fetch via XHR with the Authorization header and render the resulting blob;
 * `<img src="…">` won't work because the header can't be set on an image
 * element. The `:photo` route lives here (not in OrdersModule) to keep all
 * file IO behind PhotosService.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/orders/:id/photo')
export class AdminPhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get(':photoId')
  async findOne(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { file, mimeType } = await this.photos.loadStreamForAdmin(
      orderId,
      photoId,
    );
    res.setHeader('Content-Type', mimeType);
    return file;
  }
}

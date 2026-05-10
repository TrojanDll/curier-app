import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminPhotosController } from './admin-photos.controller';
import { CourierPhotosController } from './courier-photos.controller';
import { PhotosService } from './photos.service';

/**
 * PhotosModule — multipart upload + auth-checked retrieval (Stage 2.7).
 *
 * AuthModule is imported so JwtAuthGuard / RolesGuard are resolvable.
 * PrismaService is global; ConfigService comes from the global ConfigModule
 * registered in AppModule.
 *
 * PhotosService is exported because OrdersService embeds photo metadata into
 * order detail responses (`findOneAdmin` / `findOneCourier`), and the cleanup
 * cron in Stage 2.10 will need it for expired-row deletion.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminPhotosController, CourierPhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}

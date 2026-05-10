import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminPhotosController } from './admin-photos.controller';
import { CourierPhotosController } from './courier-photos.controller';
import { PhotosCleanupService } from './photos-cleanup.service';
import { PhotosService } from './photos.service';

/**
 * PhotosModule — multipart upload + auth-checked retrieval (Stage 2.7) and
 * hourly cleanup of expired rows + files (Stage 2.10).
 *
 * AuthModule is imported so JwtAuthGuard / RolesGuard are resolvable.
 * PrismaService is global; ConfigService comes from the global ConfigModule
 * registered in AppModule. ScheduleModule.forRoot() in AppModule wires up the
 * @Cron decorator on PhotosCleanupService.
 *
 * PhotosService is exported because OrdersService embeds photo metadata into
 * order detail responses. PhotosCleanupService is exported so e2e harnesses
 * can call `cleanup()` directly through a standalone application context.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminPhotosController, CourierPhotosController],
  providers: [PhotosService, PhotosCleanupService],
  exports: [PhotosService, PhotosCleanupService],
})
export class PhotosModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSettingsController } from './admin-settings.controller';
import { CourierSettingsController } from './courier-settings.controller';
import { SettingsService } from './settings.service';

/**
 * SettingsModule — runtime-editable tunables (§14.3.6, courier read in §7.8).
 *
 * AuthModule is imported so JwtAuthGuard / RolesGuard are resolvable in
 * this module's DI context. PrismaModule + ConfigModule are global.
 *
 * SettingsService is exported because PhotosService reads `photoTtlDays`
 * at upload time to stamp `expires_at`.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminSettingsController, CourierSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

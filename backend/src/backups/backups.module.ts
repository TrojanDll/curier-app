import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminBackupsController } from './admin-backups.controller';
import { BackupService } from './backup.service';

/**
 * BackupsModule — admin-triggered backup/restore of the whole data set
 * (DB tables + courier photos) as portable ZIP archives. See docs/backups.md.
 *
 * AuthModule is imported so JwtAuthGuard / RolesGuard resolve here.
 * PrismaModule + ConfigModule are global.
 */
@Module({
  imports: [AuthModule],
  controllers: [AdminBackupsController],
  providers: [BackupService],
})
export class BackupsModule {}

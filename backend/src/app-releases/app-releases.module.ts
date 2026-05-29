import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAppReleasesController } from './admin-app-releases.controller';
import { AppController } from './app.controller';
import { AppReleasesService } from './app-releases.service';

@Module({
  // AuthModule needed so JwtAuthGuard/RolesGuard resolve for the admin controller.
  imports: [AuthModule],
  controllers: [AdminAppReleasesController, AppController],
  providers: [AppReleasesService],
})
export class AppReleasesModule {}

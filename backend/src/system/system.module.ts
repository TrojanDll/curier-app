import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

/**
 * SystemModule — self-update серверного стека (§ self-update). AuthModule
 * импортируется ради JwtAuthGuard / RolesGuard в DI-контексте модуля.
 */
@Module({
  imports: [AuthModule],
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}

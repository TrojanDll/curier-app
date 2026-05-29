import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SystemService } from './system.service';

/**
 * Admin-only управление обновлением стека. Mounted at `/api/admin/system`.
 * `update` лишь кладёт триггер для sidecar-updater (см. SystemService) —
 * сам backend контейнерами не управляет.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get('version')
  getVersion() {
    return this.system.getVersionInfo();
  }

  @Post('update')
  @HttpCode(202)
  triggerUpdate() {
    return this.system.triggerUpdate();
  }

  @Get('update/status')
  getStatus() {
    return this.system.getUpdateStatus();
  }
}

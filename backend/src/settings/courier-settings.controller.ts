import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SettingsService } from './settings.service';

/**
 * Courier-facing read-only window into runtime app settings. Mounted at
 * `/api/courier/settings`. Exists so the Android Profile screen (§7.8) can
 * display the current photo TTL ("photos are kept for N days") and the
 * dispatcher's support contact, without giving the courier any of the
 * admin-internal fields (e.g. `updatedAt`, future audit columns) or any
 * ability to mutate the row.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['courier'])
@Controller('courier/settings')
export class CourierSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getCurrent() {
    return this.settings.getForCourier();
  }
}

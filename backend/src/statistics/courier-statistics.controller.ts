import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';
import { CourierStatsQueryDto } from './dto/courier-stats-query.dto';
import { StatisticsService } from './statistics.service';

/**
 * Courier-side personal statistics. Mounted at `/api/courier/statistics`.
 * The courier id is read from the JWT — body/URL inputs are ignored, so a
 * courier can only see their own numbers.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['courier'])
@Controller('courier/statistics')
export class CourierStatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get()
  self(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: CourierStatsQueryDto,
  ) {
    return this.statistics.getCourierSelfStats(requireUserId(user), query);
  }
}

function requireUserId(user: AuthenticatedUser | undefined): string {
  if (!user) {
    throw new Error('Authenticated user missing on request');
  }
  return user.sub;
}

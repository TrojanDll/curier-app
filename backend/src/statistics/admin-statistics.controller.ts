import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CouriersStatsQueryDto } from './dto/couriers-stats-query.dto';
import { OverviewQueryDto } from './dto/overview-query.dto';
import { StatisticsService } from './statistics.service';

/**
 * Admin-side statistics. Mounted at `/api/admin/statistics/*`.
 * Both endpoints accept the same `period | from | to` query — see
 * `OverviewQueryDto` for resolution rules.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/statistics')
export class AdminStatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get('overview')
  overview(@Query() query: OverviewQueryDto) {
    return this.statistics.getOverview(query);
  }

  @Get('couriers')
  couriers(@Query() query: CouriersStatsQueryDto) {
    return this.statistics.getCouriersBreakdown(query);
  }
}

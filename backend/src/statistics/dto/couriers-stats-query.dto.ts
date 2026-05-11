import { IsIn, IsISO8601, IsOptional } from 'class-validator';

const PERIODS = ['today', 'week', 'month'] as const;
type AdminPeriod = (typeof PERIODS)[number];

/**
 * Query for `GET /api/admin/statistics/couriers`. Same period semantics as
 * the overview endpoint — see `OverviewQueryDto`. No `topLimit` here since
 * every active courier always appears as a row.
 */
export class CouriersStatsQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: AdminPeriod;

  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;
}

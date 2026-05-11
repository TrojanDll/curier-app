import { IsIn, IsISO8601, IsOptional } from 'class-validator';

const PERIODS = ['24h', '7d', '30d'] as const;
type CourierPeriod = (typeof PERIODS)[number];

/**
 * Query for `GET /api/courier/statistics`. Named periods are tighter than
 * the admin endpoints because the courier UI has tighter buttons. `from`
 * / `to` (ISO) override the named period if both are valid.
 */
export class CourierStatsQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: CourierPeriod;

  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;
}

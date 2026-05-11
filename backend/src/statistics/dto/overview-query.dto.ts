import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

const PERIODS = ['today', 'week', 'month'] as const;
export type AdminPeriod = (typeof PERIODS)[number];

/**
 * Query for `GET /api/admin/statistics/overview`. Two windows:
 *  - Named: `period=today|week|month` (default `week` when neither
 *    period nor from/to is set). Resolved to a rolling window.
 *  - Custom: `from` / `to` ISO timestamps. If both are valid, they
 *    override the named period.
 *
 * `topLimit` clamps the number of `topCouriers` rows (default 5, max 50).
 */
export class OverviewQueryDto {
  @IsOptional()
  @IsIn(PERIODS)
  period?: AdminPeriod;

  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  topLimit?: number;
}

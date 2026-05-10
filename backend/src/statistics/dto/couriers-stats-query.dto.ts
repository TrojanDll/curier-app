/**
 * Query for `GET /api/admin/statistics/couriers`. Same period semantics as the
 * overview endpoint — see `OverviewQueryDto`.
 */
export class CouriersStatsQueryDto {
  period?: string;
  from?: string;
  to?: string;
}

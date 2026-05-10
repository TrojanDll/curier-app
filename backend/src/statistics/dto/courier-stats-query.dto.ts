/**
 * Query for `GET /api/courier/statistics`.
 *
 * Named periods are tighter than the admin endpoints because the courier UI
 * has tighter buttons:
 *  - `24h` (default) — last 24 hours.
 *  - `7d` — last 7 days.
 *  - `30d` — last 30 days.
 *
 * `from` / `to` (ISO) override the named period if both are valid.
 */
export class CourierStatsQueryDto {
  period?: string;
  from?: string;
  to?: string;
}

/**
 * Query for `GET /api/admin/statistics/overview`.
 *
 * Two ways to specify a window:
 *  - Named: `period=today|week|month` (default `week`). Resolved to a rolling
 *    window: now − 24h / 7d / 30d.
 *  - Custom: `from` / `to` ISO timestamps. If both are valid, they override
 *    `period`. If only one is valid the other defaults to `now` (for `from`)
 *    or `from − 30d` (for `to`).
 *
 * `topLimit` clamps the number of `topCouriers` rows. Default 5, max 50.
 */
export class OverviewQueryDto {
  period?: string;
  from?: string;
  to?: string;
  topLimit?: string;
}

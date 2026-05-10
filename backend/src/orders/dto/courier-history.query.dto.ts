/**
 * Query string for `GET /api/courier/orders/history`. Returns the courier's
 * own delivered + returned orders, optionally filtered by `createdAt` range.
 * Unlike the admin list, history is not paginated yet — Stage 7+ if a
 * courier ever has 1k+ orders.
 */
export class CourierHistoryQueryDto {
  /** ISO timestamp; `createdAt >= from`. Invalid → no filter. */
  from?: string;
  /** ISO timestamp; `createdAt <= to`. Invalid → no filter. */
  to?: string;
}

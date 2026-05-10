/**
 * Query string for `GET /api/admin/orders`. Mirrors the canonical pagination
 * format from §15.9 plus order-specific filters from §5.
 *
 * All fields arrive as strings (Express query parsing); OrdersService is
 * responsible for parsing/clamping into safe values.
 */
export class ListOrdersQueryDto {
  page?: string;
  pageSize?: string;
  search?: string;
  /** Whitelist: createdAt, orderNumber, status, assignedAt, deliveredAt. */
  sortBy?: string;
  /** asc | desc */
  order?: string;
  /**
   * Either `all` / empty (no filter) or comma-separated OrderStatus values
   * (e.g. `assigned,picked_up,near_customer,delivered`). Unknown tokens are
   * dropped silently; if the resulting set is empty, no filter is applied.
   */
  status?: string;
  /** UUID of the assigned courier. Invalid UUID → no filter. */
  courierId?: string;
  /** ISO timestamp; filters `createdAt >= from`. Invalid → no filter. */
  from?: string;
  /** ISO timestamp; filters `createdAt <= to`. Invalid → no filter. */
  to?: string;
}

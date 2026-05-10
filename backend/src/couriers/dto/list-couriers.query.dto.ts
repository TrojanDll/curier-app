/**
 * Query string for `GET /api/admin/couriers`. Mirrors the canonical
 * pagination format from §15.9: ?page=1&pageSize=20&search=&sortBy=&order=asc.
 *
 * All fields arrive as strings (Express query parsing); CouriersService is
 * responsible for parsing/clamping into safe values.
 */
export class ListCouriersQueryDto {
  page?: string;
  pageSize?: string;
  search?: string;
  sortBy?: string;
  order?: string;
  /** all | active | paused | disabled */
  status?: string;
}

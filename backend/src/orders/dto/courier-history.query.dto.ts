import { IsISO8601, IsOptional } from 'class-validator';

/**
 * Query string for `GET /api/courier/orders/history`. Returns the courier's
 * own delivered + returned orders, optionally filtered by `createdAt` range.
 * Unlike the admin list, history is not paginated yet — Stage 7+ if a
 * courier ever has 1k+ orders.
 */
export class CourierHistoryQueryDto {
  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;
}

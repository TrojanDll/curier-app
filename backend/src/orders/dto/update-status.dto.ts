import type { OrderStatus } from '@prisma/client';

/**
 * Body for `PUT /api/courier/orders/:id/status`. Courier sends an explicit
 * target status — OrdersService validates it is the next forward step from
 * the current value (assigned → picked_up → near_customer → delivered →
 * returned). Anything else returns 409.
 */
export class UpdateStatusDto {
  status!: OrderStatus;
}

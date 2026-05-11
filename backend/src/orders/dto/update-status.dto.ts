import { OrderStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Body for `PUT /api/courier/orders/:id/status`. Courier sends an explicit
 * target status — OrdersService validates it is the next forward step from
 * the current value (assigned → picked_up → near_customer → delivered →
 * returned). Anything else returns 409.
 *
 * IsEnum here rejects values outside the Prisma `order_status` enum before
 * the service runs; the forward-only check is still enforced server-side.
 */
export class UpdateStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

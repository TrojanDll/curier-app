import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `PUT /api/courier/orders/:id/status`. Courier sends an explicit
 * target status — OrdersService validates it is the next forward step from
 * the current value (assigned → picked_up → near_customer → delivered →
 * returned). Anything else returns 409.
 *
 * IsEnum here rejects values outside the Prisma `order_status` enum before
 * the service runs; the forward-only check is still enforced server-side.
 *
 * `cancellationReason` is only meaningful when `status === 'cancelled'`: the
 * service requires a non-empty reason for that side-transition and ignores it
 * otherwise.
 */
export class UpdateStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}

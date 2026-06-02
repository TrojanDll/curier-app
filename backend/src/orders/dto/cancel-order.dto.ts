import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body for `POST /api/admin/orders/:id/cancel`. The admin must supply a
 * non-empty reason (e.g. "customer unreachable") — it's stored on the order
 * and surfaced in the courier app + admin drawer.
 */
export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

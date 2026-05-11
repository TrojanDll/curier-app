import {
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `PATCH /api/admin/orders/:id`. Only allowed when `status='new'`
 * (§5) — OrdersService rejects with 409 otherwise.
 *
 * Every field is optional. Sending `comments: null` or `price: null` clears
 * the value; omitting the field leaves it untouched. Status, courier
 * assignment, and audit timestamps are managed by dedicated endpoints.
 */
export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  productDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  comments?: string | null;

  @IsOptional()
  @IsNumberString()
  price?: string | null;
}

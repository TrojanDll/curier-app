import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /api/admin/orders`. `orderNumber`, `status`,
 * `createdByAdminId`, and audit timestamps are server-set so they never
 * appear in the DTO.
 *
 * `courierId` is optional. When present the admin is bypassing auto-assign
 * to hand the order to a specific courier — same eligibility rules as the
 * reassign endpoint apply (active, not paused). When omitted the server
 * runs the §8 auto-assign pass.
 *
 * `price` is sent as a string (`"123.45"`) so JSON float drift does not
 * corrode the Decimal(10,2) column. `IsNumberString` accepts decimal points
 * by default; a leading sign would also be allowed but is harmless for
 * orders (negative price stops at the DB constraint anyway).
 */
export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  customerName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  customerPhone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  deliveryAddress!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  productDescription!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  comments?: string | null;

  @IsOptional()
  @IsNumberString()
  price?: string | null;

  @IsOptional()
  @IsUUID()
  courierId?: string;
}

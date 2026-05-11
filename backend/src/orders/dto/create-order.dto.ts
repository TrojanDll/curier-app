import {
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /api/admin/orders`. `orderNumber`, `status`, `courierId`,
 * `createdByAdminId`, and any audit timestamps are server-set so they
 * never appear in the DTO. Auto-assign (Stage 2.6) decides which courier
 * gets the order; the body cannot pre-assign one.
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
}

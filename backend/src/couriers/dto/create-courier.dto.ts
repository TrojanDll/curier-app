import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `POST /api/admin/couriers`. dateOfBirth accepts either a date-only
 * `YYYY-MM-DD` or a full ISO timestamp — IsISO8601 (strict=false) covers both.
 * The DB column is `date`, so CouriersService still passes through `new Date()`
 * to coerce.
 *
 * `@IsOptional()` is what makes nullable behaviour work: omitted keys leave the
 * value untouched (PATCH semantics), explicit `null` clears it. class-validator
 * treats both `undefined` and `null` as "skip validators after IsOptional" so
 * an explicit null on email passes through `IsEmail()` without rejection.
 */
export class CreateCourierDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @IsOptional()
  @IsISO8601({ strict: false })
  dateOfBirth?: string | null;
}

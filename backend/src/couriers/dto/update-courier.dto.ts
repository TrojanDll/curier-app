import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Body for `PATCH /api/admin/couriers/:id`. Every field is optional; only
 * fields present in the request body are touched. Sending `email: null`
 * clears the value, omitting `email` leaves it as-is.
 *
 * Password is intentionally not here — use `POST /:id/reset-password` so
 * the access-token-revoke side effect runs.
 */
export class UpdateCourierDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  fullName?: string;

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

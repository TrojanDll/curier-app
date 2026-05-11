import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body for `PUT /api/courier/profile`. Couriers can only edit their own
 * email and phone — username, full name, dob etc. are admin-only.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;
}

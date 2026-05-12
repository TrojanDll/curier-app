import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /api/auth/admin/change-password`. The admin types both
 * the current and the new password — the current acts as a re-auth step
 * so a stolen short-lived access token can't silently change credentials.
 *
 * Length constraints match `INITIAL_ADMIN_PASSWORD` / `ResetPasswordDto`
 * for consistency across the codebase: min 8 (stronger than couriers' 6
 * because admins have full panel access) and max 128 (matches bcrypt's
 * effective 72-byte input limit with a margin).
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}

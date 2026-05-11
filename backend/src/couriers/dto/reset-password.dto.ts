import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for `POST /api/admin/couriers/:id/reset-password`. Admin types the
 * new password directly (per §15.4 — option a, not a one-time token flow).
 * Same length constraints as `CreateCourierDto.password` so a courier
 * cannot be reset to a password they would not have been allowed to create.
 */
export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword!: string;
}

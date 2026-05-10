/**
 * Body for `POST /api/admin/couriers/:id/reset-password`. Admin types the
 * new password directly (per §15.4 — option a, not a one-time token flow).
 */
export class ResetPasswordDto {
  newPassword!: string;
}

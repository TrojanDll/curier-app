/**
 * Body for `POST /api/auth/refresh` and `POST /api/auth/logout`.
 * class-validator decorators come in Stage 2.14.
 */
export class RefreshDto {
  refreshToken!: string;
}

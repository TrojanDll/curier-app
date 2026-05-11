import { IsString, MinLength } from 'class-validator';

/**
 * Body for `POST /api/auth/refresh` and `POST /api/auth/logout`. Token is
 * an opaque random hex string; we only assert it is a non-empty string
 * and let AuthService do the real lookup + revoke checks.
 */
export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

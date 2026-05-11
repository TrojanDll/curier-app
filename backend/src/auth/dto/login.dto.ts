import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Login payload for both admin and courier endpoints. Same shape, different
 * service path. We validate length only — the strength rule lives on the
 * write side (CreateCourier / ResetPassword) so existing weak passwords
 * keep working through login.
 */
export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

/**
 * Login payload for both admin and courier endpoints.
 * class-validator decorators come in Stage 2.14.
 */
export class LoginDto {
  username!: string;
  password!: string;
}

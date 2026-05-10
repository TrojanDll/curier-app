import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Drop-in `AuthGuard('jwt')` wrapper so callers don't pass the strategy name
 * by string everywhere. Pair with {@link RolesGuard} for role-restricted routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

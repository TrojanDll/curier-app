import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser, JwtPayload, Role } from '../types/jwt-payload';

/**
 * Single JWT strategy for both admins and couriers. Role-based separation is
 * done downstream by {@link RolesGuard} reading the `role` claim.
 *
 * Tokens are short-lived (`JWT_ACCESS_TTL`, default 15m); long-term sessions
 * are kept by opaque rotated refresh tokens — see {@link AuthService.refresh}.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      !this.isRole(payload.role)
    ) {
      throw new UnauthorizedException('Malformed token payload');
    }
    return { sub: payload.sub, role: payload.role };
  }

  private isRole(value: unknown): value is Role {
    return value === 'admin' || value === 'courier';
  }
}

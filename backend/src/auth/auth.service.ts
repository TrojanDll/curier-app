import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserType } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { comparePassword, hashPassword } from './password.util';
import { parseTtlMs } from './ttl.util';
import type { JwtPayload, Role } from './types/jwt-payload';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AdminProfile {
  id: string;
  username: string;
  fullName: string;
}

export interface CourierProfile {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  isPaused: boolean;
}

export interface AdminLoginResult extends TokenPair {
  user: AdminProfile;
}

export interface CourierLoginResult extends TokenPair {
  user: CourierProfile;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async loginAdmin(
    username: string,
    password: string,
  ): Promise<AdminLoginResult> {
    const admin = await this.prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await comparePassword(password, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokenPair(admin.id, 'admin');
    return {
      ...tokens,
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
      },
    };
  }

  async loginCourier(
    username: string,
    password: string,
  ): Promise<CourierLoginResult> {
    const courier = await this.prisma.courier.findUnique({
      where: { username },
    });
    if (!courier) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // is_paused does NOT block login — paused couriers still see their state.
    // is_active=false ("fired") does — they should not be able to sign in.
    if (!courier.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const ok = await comparePassword(password, courier.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(courier.id, 'courier');
    return {
      ...tokens,
      user: {
        id: courier.id,
        username: courier.username,
        fullName: courier.fullName,
        email: courier.email,
        phone: courier.phone,
        isActive: courier.isActive,
        isPaused: courier.isPaused,
      },
    };
  }

  /**
   * Refresh-token rotation: revoke the presented refresh token and issue a
   * fresh access+refresh pair. Reusing a revoked or expired token throws 401.
   */
  async refresh(rawRefresh: string): Promise<TokenPair> {
    const tokenHash = this.hashRefreshToken(rawRefresh);
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false },
    });
    if (!record) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const role: Role = record.userType === UserType.admin ? 'admin' : 'courier';

    // Re-check user still exists and is allowed in. A courier disabled between
    // login and refresh must not be able to extend their session.
    if (role === 'admin') {
      const admin = await this.prisma.admin.findUnique({
        where: { id: record.userId },
      });
      if (!admin) {
        throw new UnauthorizedException('User not found');
      }
    } else {
      const courier = await this.prisma.courier.findUnique({
        where: { id: record.userId },
      });
      if (!courier || !courier.isActive) {
        throw new UnauthorizedException('User not found or disabled');
      }
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revoked: true },
    });

    return this.issueTokenPair(record.userId, role);
  }

  /**
   * Idempotent — calling logout with an unknown/already-revoked token is fine.
   * Returns 204 from the controller regardless of whether anything was revoked.
   */
  async logout(rawRefresh: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(rawRefresh);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });
  }

  /**
   * Self-service password change for an authenticated admin (§14.3.6).
   *
   * The current password is verified before writing — this defends against
   * an access-token leak being escalated into a permanent takeover. After a
   * successful change, *all* refresh tokens for this admin are revoked so
   * any other session/device must re-login. The current session's access
   * token stays valid until its short TTL expires, which is acceptable —
   * the attacker would have to refresh, which now fails.
   */
  async changeAdminPassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      // JWT verification already happened — this can only fire if the admin
      // was deleted between request issuance and now. 404 reads better than
      // 401 for that edge case.
      throw new NotFoundException('Admin not found');
    }

    const ok = await comparePassword(currentPassword, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.admin.update({
        where: { id: admin.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId: admin.id,
          userType: UserType.admin,
          revoked: false,
        },
        data: { revoked: true },
      }),
    ]);
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async issueTokenPair(userId: string, role: Role): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, role };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = this.generateRefreshToken();
    const tokenHash = this.hashRefreshToken(refreshToken);
    const ttlMs = parseTtlMs(this.config.getOrThrow<string>('JWT_REFRESH_TTL'));
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        userType: role === 'admin' ? UserType.admin : UserType.courier,
        tokenHash,
        expiresAt,
        revoked: false,
      },
    });

    return { accessToken, refreshToken };
  }

  private generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

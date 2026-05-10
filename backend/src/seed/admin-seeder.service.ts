import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashPassword } from '../auth/password.util';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_FULL_NAME = 'Initial Admin';

/**
 * Idempotent first-admin seed for a fresh deployment (§14.2.11).
 *
 * Behaviour matrix on application bootstrap:
 *  - admins table non-empty → skip silently (debug log).
 *  - admins empty + INITIAL_ADMIN_USERNAME/PASSWORD set → create the admin.
 *  - admins empty + env unset/blank → warn and skip; bootstrap still
 *    succeeds so the operator can seed later via a manual script. Failing
 *    bootstrap here would block recovery scenarios where the env was
 *    forgotten.
 *
 * Once any admin row exists we never re-seed or overwrite — even if the env
 * values change. Updates after the first deploy go through admin-side
 * password reset flows.
 */
@Injectable()
export class AdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existing = await this.prisma.admin.count();
    if (existing > 0) {
      this.logger.debug(
        `Admin seed skipped: ${existing} admin(s) already exist`,
      );
      return;
    }

    const username = (
      this.config.get<string>('INITIAL_ADMIN_USERNAME') ?? ''
    ).trim();
    // Password is preserved verbatim — leading/trailing whitespace may be
    // intentional, so only username and fullName get trimmed.
    const password = this.config.get<string>('INITIAL_ADMIN_PASSWORD') ?? '';
    const fullNameRaw = (
      this.config.get<string>('INITIAL_ADMIN_FULL_NAME') ?? ''
    ).trim();
    const fullName = fullNameRaw.length > 0 ? fullNameRaw : DEFAULT_FULL_NAME;

    if (!username || !password) {
      this.logger.warn(
        'Admin seed skipped: INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD are not configured. Seed an admin manually before logging in.',
      );
      return;
    }

    const passwordHash = await hashPassword(password);
    await this.prisma.admin.create({
      data: { username, passwordHash, fullName },
    });
    this.logger.log(`Seeded initial admin '${username}'`);
  }
}

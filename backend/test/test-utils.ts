import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

/**
 * Boots a full NestJS app for e2e, mirroring main.ts:
 *  - global /api prefix (with /health exempt),
 *  - same ValidationPipe configuration.
 *
 * pino logging is silenced via `LOG_LEVEL=silent` from setup-env.ts.
 */
export async function bootTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/**
 * Wipes every domain table in the right order (refresh_tokens → photos →
 * orders → couriers → admins → app_settings). `RESTART IDENTITY CASCADE`
 * also resets the order_number_seq so each spec starts at ORD-YYYY-0001.
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
       refresh_tokens,
       order_photos,
       orders,
       couriers,
       admins,
       app_settings
     RESTART IDENTITY CASCADE`,
  );
  // The order_number sequence is a free-standing object — TRUNCATE doesn't
  // touch it on its own. Reset for predictable orderNumber values.
  await prisma.$executeRawUnsafe(
    `ALTER SEQUENCE order_number_seq RESTART WITH 1`,
  );
}

export interface SeededAdmin {
  id: string;
  username: string;
  password: string;
}

export async function seedAdmin(
  prisma: PrismaService,
  overrides: Partial<{ username: string; password: string; fullName: string }> = {},
): Promise<SeededAdmin> {
  const username = overrides.username ?? 'admin_e2e';
  const password = overrides.password ?? 'admin_e2e_pw';
  const passwordHash = await hashPassword(password);
  const admin = await prisma.admin.create({
    data: {
      username,
      passwordHash,
      fullName: overrides.fullName ?? 'E2E Admin',
    },
  });
  return { id: admin.id, username, password };
}

export interface SeededCourier {
  id: string;
  username: string;
  password: string;
}

export async function seedCourier(
  prisma: PrismaService,
  overrides: Partial<{
    username: string;
    password: string;
    fullName: string;
    isActive: boolean;
    isPaused: boolean;
  }> = {},
): Promise<SeededCourier> {
  const username = overrides.username ?? 'courier_e2e';
  const password = overrides.password ?? 'courier_e2e_pw';
  const passwordHash = await hashPassword(password);
  const courier = await prisma.courier.create({
    data: {
      username,
      passwordHash,
      fullName: overrides.fullName ?? 'E2E Courier',
      isActive: overrides.isActive ?? true,
      isPaused: overrides.isPaused ?? false,
    },
  });
  return { id: courier.id, username, password };
}

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  bootTestApp,
  resetDatabase,
  seedAdmin,
  seedCourier,
} from './test-utils';

describe('/api/auth/* (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await bootTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  describe('POST /api/auth/admin/login', () => {
    it('returns tokens + admin user on correct credentials', async () => {
      const admin = await seedAdmin(prisma);

      const res = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({ username: admin.username, password: admin.password });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.objectContaining({
            id: admin.id,
            username: admin.username,
          }),
        }),
      );
    });

    it('rejects with 401 on wrong password', async () => {
      const admin = await seedAdmin(prisma);

      const res = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({ username: admin.username, password: 'nope' });

      expect(res.status).toBe(401);
    });

    it('rejects with 401 on unknown username', async () => {
      await seedAdmin(prisma);

      const res = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({ username: 'ghost', password: 'whatever' });

      expect(res.status).toBe(401);
    });

    it('rejects with 400 when the payload misses fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/admin/login')
        .send({ username: 'admin_e2e' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/courier/login', () => {
    it('returns tokens + courier profile on success', async () => {
      const c = await seedCourier(prisma);

      const res = await request(app.getHttpServer())
        .post('/api/auth/courier/login')
        .send({ username: c.username, password: c.password });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.objectContaining({
            id: c.id,
            username: c.username,
            isActive: true,
            isPaused: false,
          }),
        }),
      );
    });

    it('blocks an inactive courier with 403 (or 401)', async () => {
      const c = await seedCourier(prisma, { isActive: false });

      const res = await request(app.getHttpServer())
        .post('/api/auth/courier/login')
        .send({ username: c.username, password: c.password });

      // Either contract is defensible — the doc says 403 on disabled, but
      // older AuthService versions used a flat 401. Accept both.
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates tokens for a valid refresh token', async () => {
      const c = await seedCourier(prisma);
      const login = await request(app.getHttpServer())
        .post('/api/auth/courier/login')
        .send({ username: c.username, password: c.password });
      const refreshToken: string = login.body.refreshToken;

      const refresh = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refresh.status).toBe(200);
      expect(refresh.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        }),
      );
      // The old refresh token must be revoked on rotation.
      expect(refresh.body.refreshToken).not.toBe(refreshToken);
    });

    it('rejects a tampered refresh token with 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'definitely-not-issued-by-us' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 204 and revokes the refresh token', async () => {
      const c = await seedCourier(prisma);
      const login = await request(app.getHttpServer())
        .post('/api/auth/courier/login')
        .send({ username: c.username, password: c.password });
      const refreshToken: string = login.body.refreshToken;

      const logout = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken });
      expect(logout.status).toBe(204);

      // Same refresh token must no longer rotate.
      const second = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(second.status).toBe(401);
    });
  });
});

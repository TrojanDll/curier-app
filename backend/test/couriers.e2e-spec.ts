import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  bootTestApp,
  resetDatabase,
  seedAdmin,
  seedCourier,
} from './test-utils';

/**
 * Admin + courier-self endpoints for `/api/{admin,courier}/...` covering
 * the courier resource (§14.7.3 / coverage push for §14.7.6).
 */
describe('Couriers (e2e)', () => {
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

  async function adminToken() {
    const a = await seedAdmin(prisma);
    const r = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ username: a.username, password: a.password });
    return r.body.accessToken as string;
  }

  async function courierToken(opts: { username?: string; password?: string } = {}) {
    const c = await seedCourier(prisma, opts);
    const r = await request(app.getHttpServer())
      .post('/api/auth/courier/login')
      .send({ username: c.username, password: c.password });
    return { id: c.id, accessToken: r.body.accessToken as string };
  }

  describe('admin endpoints', () => {
    it('POST /api/admin/couriers creates a courier', async () => {
      const tok = await adminToken();
      const r = await request(app.getHttpServer())
        .post('/api/admin/couriers')
        .set('Authorization', `Bearer ${tok}`)
        .send({
          username: 'new_courier',
          password: 'newpass123',
          fullName: 'Новый Курьер',
          email: 'new@example.com',
          phone: '+79991234567',
        });
      expect(r.status).toBe(201);
      expect(r.body).toEqual(
        expect.objectContaining({
          username: 'new_courier',
          fullName: 'Новый Курьер',
          isActive: true,
          isPaused: false,
        }),
      );
      expect(r.body).not.toHaveProperty('passwordHash');
    });

    it('POST /api/admin/couriers rejects duplicate username with 409', async () => {
      const tok = await adminToken();
      await seedCourier(prisma, { username: 'dup' });

      const r = await request(app.getHttpServer())
        .post('/api/admin/couriers')
        .set('Authorization', `Bearer ${tok}`)
        .send({
          username: 'dup',
          password: 'newpass123',
          fullName: 'Дубль',
        });
      expect(r.status).toBe(409);
    });

    it('POST /api/admin/couriers rejects short password with 400', async () => {
      const tok = await adminToken();
      const r = await request(app.getHttpServer())
        .post('/api/admin/couriers')
        .set('Authorization', `Bearer ${tok}`)
        .send({
          username: 'shortpwd',
          password: '123',
          fullName: 'Бад Пасс',
        });
      expect(r.status).toBe(400);
    });

    it('GET /api/admin/couriers paginates', async () => {
      const tok = await adminToken();
      await seedCourier(prisma, { username: 'c1' });
      await seedCourier(prisma, { username: 'c2' });

      const r = await request(app.getHttpServer())
        .get('/api/admin/couriers?page=1&pageSize=10')
        .set('Authorization', `Bearer ${tok}`);
      expect(r.status).toBe(200);
      expect(r.body).toEqual(
        expect.objectContaining({
          items: expect.any(Array),
          total: 2,
          page: 1,
          pageSize: 10,
        }),
      );
    });

    it('PATCH /api/admin/couriers/:id updates contact fields', async () => {
      const tok = await adminToken();
      const c = await seedCourier(prisma, { username: 'edit_me' });

      const r = await request(app.getHttpServer())
        .patch(`/api/admin/couriers/${c.id}`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ email: 'edited@example.com', phone: '+79990000000' });
      expect(r.status).toBe(200);
      expect(r.body.email).toBe('edited@example.com');
      expect(r.body.phone).toBe('+79990000000');
    });

    it('POST /api/admin/couriers/:id/pause and /resume toggle is_paused', async () => {
      const tok = await adminToken();
      const c = await seedCourier(prisma);

      const pause = await request(app.getHttpServer())
        .post(`/api/admin/couriers/${c.id}/pause`)
        .set('Authorization', `Bearer ${tok}`);
      expect(pause.status).toBe(200);
      expect(pause.body.isPaused).toBe(true);

      const resume = await request(app.getHttpServer())
        .post(`/api/admin/couriers/${c.id}/resume`)
        .set('Authorization', `Bearer ${tok}`);
      expect(resume.status).toBe(200);
      expect(resume.body.isPaused).toBe(false);
    });

    it('DELETE /api/admin/couriers/:id soft-deletes (isActive=false)', async () => {
      const tok = await adminToken();
      const c = await seedCourier(prisma);

      const del = await request(app.getHttpServer())
        .delete(`/api/admin/couriers/${c.id}`)
        .set('Authorization', `Bearer ${tok}`);
      expect(del.status).toBe(200);
      expect(del.body.isActive).toBe(false);

      // Soft delete: row still exists.
      const exists = await prisma.courier.findUnique({ where: { id: c.id } });
      expect(exists?.isActive).toBe(false);
    });

    it('POST /api/admin/couriers/:id/reset-password returns 204', async () => {
      const tok = await adminToken();
      const c = await seedCourier(prisma);

      const r = await request(app.getHttpServer())
        .post(`/api/admin/couriers/${c.id}/reset-password`)
        .set('Authorization', `Bearer ${tok}`)
        .send({ newPassword: 'fresh_pw_value' });
      expect(r.status).toBe(204);

      // New password works.
      const login = await request(app.getHttpServer())
        .post('/api/auth/courier/login')
        .send({ username: c.username, password: 'fresh_pw_value' });
      expect(login.status).toBe(200);
    });

    it('GET /api/admin/couriers/:id 404s for missing id', async () => {
      const tok = await adminToken();
      const r = await request(app.getHttpServer())
        .get('/api/admin/couriers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tok}`);
      expect(r.status).toBe(404);
    });
  });

  describe('courier self-service', () => {
    it('GET /api/courier/profile returns the calling courier', async () => {
      const c = await courierToken();
      const r = await request(app.getHttpServer())
        .get('/api/courier/profile')
        .set('Authorization', `Bearer ${c.accessToken}`);
      expect(r.status).toBe(200);
      expect(r.body.id).toBe(c.id);
    });

    it('PUT /api/courier/profile updates only email/phone', async () => {
      const c = await courierToken();
      const r = await request(app.getHttpServer())
        .put('/api/courier/profile')
        .set('Authorization', `Bearer ${c.accessToken}`)
        .send({ email: 'self@example.com', phone: '+79991110011' });
      expect(r.status).toBe(200);
      expect(r.body.email).toBe('self@example.com');
      expect(r.body.phone).toBe('+79991110011');
    });
  });
});

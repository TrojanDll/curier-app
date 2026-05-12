import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  bootTestApp,
  resetDatabase,
  seedAdmin,
  seedCourier,
} from './test-utils';

describe('Settings (e2e)', () => {
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

  async function courierToken() {
    const c = await seedCourier(prisma);
    const r = await request(app.getHttpServer())
      .post('/api/auth/courier/login')
      .send({ username: c.username, password: c.password });
    return r.body.accessToken as string;
  }

  it('GET /api/admin/settings returns the singleton row', async () => {
    const tok = await adminToken();
    const r = await request(app.getHttpServer())
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual(
      expect.objectContaining({
        photoTtlDays: expect.any(Number),
        updatedAt: expect.any(String),
      }),
    );
  });

  it('PATCH /api/admin/settings updates photoTtlDays + supportContact', async () => {
    const tok = await adminToken();
    const r = await request(app.getHttpServer())
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${tok}`)
      .send({ photoTtlDays: 14, supportContact: '@dispatcher' });
    expect(r.status).toBe(200);
    expect(r.body.photoTtlDays).toBe(14);
    expect(r.body.supportContact).toBe('@dispatcher');
  });

  it('PATCH /api/admin/settings rejects negative TTL with 400', async () => {
    const tok = await adminToken();
    const r = await request(app.getHttpServer())
      .patch('/api/admin/settings')
      .set('Authorization', `Bearer ${tok}`)
      .send({ photoTtlDays: -5 });
    expect(r.status).toBe(400);
  });

  it('GET /api/courier/settings returns the read-only courier-facing view', async () => {
    const tok = await courierToken();
    const r = await request(app.getHttpServer())
      .get('/api/courier/settings')
      .set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual(
      expect.objectContaining({ photoTtlDays: expect.any(Number) }),
    );
  });

  it('admin token cannot hit courier settings (RolesGuard)', async () => {
    const tok = await adminToken();
    const r = await request(app.getHttpServer())
      .get('/api/courier/settings')
      .set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(403);
  });
});

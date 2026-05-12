import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  bootTestApp,
  resetDatabase,
  seedAdmin,
  seedCourier,
} from './test-utils';

describe('Statistics (e2e)', () => {
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
    return { id: c.id, accessToken: r.body.accessToken as string };
  }

  it('GET /api/admin/statistics/overview returns aggregate KPIs', async () => {
    const tok = await adminToken();
    const r = await request(app.getHttpServer())
      .get('/api/admin/statistics/overview')
      .set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    // OverviewResponse shape: period + KPIs + chart buckets. Numbers
    // are zero on the empty DB.
    expect(r.body).toEqual(
      expect.objectContaining({
        period: expect.any(Object),
        totalOrders: expect.any(Number),
        delivered: expect.any(Number),
        revenue: expect.any(String),
        ordersPerBucket: expect.any(Array),
        topCouriers: expect.any(Array),
      }),
    );
  });

  it('GET /api/admin/statistics/couriers returns per-courier breakdown', async () => {
    const tok = await adminToken();
    await seedCourier(prisma, { username: 'stat_c1' });

    const r = await request(app.getHttpServer())
      .get('/api/admin/statistics/couriers')
      .set('Authorization', `Bearer ${tok}`);
    expect(r.status).toBe(200);
    // CouriersStatsResponse: { period, couriers: [...] }
    expect(r.body).toEqual(
      expect.objectContaining({
        period: expect.any(Object),
        couriers: expect.any(Array),
      }),
    );
    expect(r.body.couriers.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/courier/statistics returns self-stats with period defaults', async () => {
    const c = await courierToken();
    const r = await request(app.getHttpServer())
      .get('/api/courier/statistics')
      .set('Authorization', `Bearer ${c.accessToken}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual(
      expect.objectContaining({
        period: expect.any(Object),
        totalDeliveries: expect.any(Number),
        successfulDeliveries: expect.any(Number),
      }),
    );
  });

  it('GET /api/courier/statistics?period=7d honours custom period', async () => {
    const c = await courierToken();
    const r = await request(app.getHttpServer())
      .get('/api/courier/statistics?period=7d')
      .set('Authorization', `Bearer ${c.accessToken}`);
    expect(r.status).toBe(200);
    expect(r.body.period).toBeTruthy();
  });

  it('rejects unauthenticated calls to /api/admin/statistics/overview', async () => {
    const r = await request(app.getHttpServer()).get(
      '/api/admin/statistics/overview',
    );
    expect(r.status).toBe(401);
  });
});

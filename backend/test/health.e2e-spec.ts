import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootTestApp } from './test-utils';

describe('/health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await bootTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds 200 with { status: "ok" }', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: 'ok' }));
  });

  it('lives outside the /api prefix', async () => {
    // Sanity check: /api/health should NOT be a route (the global prefix
    // exempts /health).
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(404);
  });
});

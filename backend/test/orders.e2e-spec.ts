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
 * Order lifecycle e2e (§14.7.3). One eligible courier exists, so admin
 * `POST /api/admin/orders` should auto-assign on create. We then walk the
 * courier through every status transition and verify history bucketing.
 */
describe('Orders (e2e)', () => {
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

  async function loginAdmin() {
    const a = await seedAdmin(prisma);
    const r = await request(app.getHttpServer())
      .post('/api/auth/admin/login')
      .send({ username: a.username, password: a.password });
    return r.body.accessToken as string;
  }

  async function loginCourier(opts?: { isActive?: boolean; isPaused?: boolean }) {
    const c = await seedCourier(prisma, opts);
    const r = await request(app.getHttpServer())
      .post('/api/auth/courier/login')
      .send({ username: c.username, password: c.password });
    return {
      id: c.id,
      accessToken: r.body.accessToken as string,
    };
  }

  function newOrderBody(over: Partial<Record<string, string>> = {}) {
    return {
      customerName: 'Иван Петров',
      customerPhone: '+79991112233',
      deliveryAddress: 'ул. Тестовая 1',
      productDescription: 'Коробка',
      ...over,
    };
  }

  it('POST /api/admin/orders auto-assigns when an eligible courier is free', async () => {
    const adminTok = await loginAdmin();
    const courier = await loginCourier();

    const create = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody());

    expect(create.status).toBe(201);
    expect(create.body).toEqual(
      expect.objectContaining({
        status: 'assigned',
        courierId: courier.id,
        orderNumber: expect.stringMatching(/^ORD-\d{4}-0001$/),
        assignedAt: expect.any(String),
      }),
    );

    // Courier sees it in active list.
    const active = await request(app.getHttpServer())
      .get('/api/courier/orders/active')
      .set('Authorization', `Bearer ${courier.accessToken}`);
    expect(active.status).toBe(200);
    expect(active.body).toHaveLength(1);
    expect(active.body[0].id).toBe(create.body.id);
    // Price field stripped from courier DTO (§15.1).
    expect(active.body[0]).not.toHaveProperty('price');
  });

  it('leaves order in `new` when no courier is eligible', async () => {
    const adminTok = await loginAdmin();
    // Paused courier → not eligible.
    await loginCourier({ isPaused: true });

    const create = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody());

    expect(create.status).toBe(201);
    expect(create.body.status).toBe('new');
    expect(create.body.courierId).toBeNull();
  });

  it('forward-only courier transitions, including the auto-drain on returned', async () => {
    const adminTok = await loginAdmin();
    const courier = await loginCourier();

    // 1) Create + auto-assign first order.
    const first = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody({ customerName: 'A' }));
    expect(first.body.status).toBe('assigned');

    // 2) Create a second order — courier is busy, so it stays `new`.
    const second = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody({ customerName: 'B' }));
    expect(second.body.status).toBe('new');

    // 3) Walk first order: assigned → picked_up → near_customer → delivered → returned.
    const transitions = ['picked_up', 'near_customer', 'delivered', 'returned'] as const;
    for (const target of transitions) {
      const r = await request(app.getHttpServer())
        .put(`/api/courier/orders/${first.body.id}/status`)
        .set('Authorization', `Bearer ${courier.accessToken}`)
        .send({ status: target });
      expect(r.status).toBe(200);
      expect(r.body.status).toBe(target);
    }

    // 4) After `returned`, AssignmentService.tryAssignToFreeCourier should
    //    drain the second (queued) order to this courier.
    const active = await request(app.getHttpServer())
      .get('/api/courier/orders/active')
      .set('Authorization', `Bearer ${courier.accessToken}`);
    expect(active.body).toHaveLength(1);
    expect(active.body[0].id).toBe(second.body.id);
    expect(active.body[0].status).toBe('assigned');

    // 5) First order is now in history (status=returned).
    const history = await request(app.getHttpServer())
      .get('/api/courier/orders/history')
      .set('Authorization', `Bearer ${courier.accessToken}`);
    const ids = (history.body as Array<{ id: string }>).map((o) => o.id);
    expect(ids).toContain(first.body.id);
  });

  it('rejects skipping a transition step with 409', async () => {
    const adminTok = await loginAdmin();
    const courier = await loginCourier();
    const created = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody());

    const skip = await request(app.getHttpServer())
      .put(`/api/courier/orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${courier.accessToken}`)
      .send({ status: 'delivered' });
    expect(skip.status).toBe(409);
  });

  it('foreign-courier 404s a /api/courier/orders/:id read', async () => {
    const adminTok = await loginAdmin();
    const ownerA = await loginCourier({ });
    // Disable the first so the second auto-assign target wins for the next create.
    await prisma.courier.update({
      where: { id: ownerA.id },
      data: { isPaused: true },
    });
    const ownerB = await seedCourier(prisma, { username: 'courier_b' });

    // Create — only B is eligible.
    const created = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody());
    expect(created.body.courierId).toBe(ownerB.id);

    // A logs in fresh (now paused, but they can still call the API with an
    // access token they already had — we just need any courier token).
    // Easier: log in A *before* pausing, but that's not what we wired. Use
    // a third courier with a clean session instead.
    await prisma.courier.update({
      where: { id: ownerA.id },
      data: { isPaused: false },
    });
    const foreign = await request(app.getHttpServer())
      .post('/api/auth/courier/login')
      .send({ username: 'courier_e2e', password: 'courier_e2e_pw' });
    const foreignTok = foreign.body.accessToken as string;

    const r = await request(app.getHttpServer())
      .get(`/api/courier/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${foreignTok}`);
    expect(r.status).toBe(404);
  });

  it('admin reassign moves order to a different eligible courier', async () => {
    const adminTok = await loginAdmin();
    // Two couriers — A gets the first auto-assign by createdAt order, B is
    // the reassign target.
    const a = await loginCourier({});
    const b = await seedCourier(prisma, {
      username: 'courier_b',
      password: 'courier_b_pw',
    });

    const created = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody());
    expect(created.body.courierId).toBe(a.id);

    const reassign = await request(app.getHttpServer())
      .post(`/api/admin/orders/${created.body.id}/reassign`)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ courierId: b.id });
    expect(reassign.status).toBe(200);
    expect(reassign.body.courierId).toBe(b.id);
    expect(reassign.body.status).toBe('assigned');
  });

  it('reassign of an already picked-up order returns 409', async () => {
    const adminTok = await loginAdmin();
    const a = await loginCourier({});
    const b = await seedCourier(prisma, { username: 'courier_b' });

    const created = await request(app.getHttpServer())
      .post('/api/admin/orders')
      .set('Authorization', `Bearer ${adminTok}`)
      .send(newOrderBody());

    await request(app.getHttpServer())
      .put(`/api/courier/orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ status: 'picked_up' });

    const reassign = await request(app.getHttpServer())
      .post(`/api/admin/orders/${created.body.id}/reassign`)
      .set('Authorization', `Bearer ${adminTok}`)
      .send({ courierId: b.id });
    expect(reassign.status).toBe(409);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/courier/orders/active');
    expect(r.status).toBe(401);
  });

  it('admin token cannot hit courier endpoints (RolesGuard)', async () => {
    const adminTok = await loginAdmin();
    const r = await request(app.getHttpServer())
      .get('/api/courier/orders/active')
      .set('Authorization', `Bearer ${adminTok}`);
    expect(r.status).toBe(403);
  });
});

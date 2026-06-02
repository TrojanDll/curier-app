import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Order } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import type { CourierAdminResponse } from '../couriers/couriers.service';
import {
  toOrderAdminResponse,
  toOrderCourierResponse,
} from '../orders/order.mappers';
import type { Role } from '../auth/types/jwt-payload';

/**
 * RealtimeGateway — Socket.IO gateway under `/realtime` (Stage 2.9, §9 of
 * completion_plan.md).
 *
 * Rooms:
 * - `admin` — every admin socket joins on connect; receives `orders:updated`
 *   and `couriers:status`.
 * - `courier:<id>` — every courier socket joins their own room; receives
 *   `orders:new` (a fresh assignment) and `orders:reassigned` (admin moved
 *   an existing order — fired to BOTH old and new courier).
 *
 * Auth: handshake middleware verifies an HS256 JWT pulled from
 * `socket.handshake.auth.token`. On failure the connection is rejected with
 * `connect_error`. We do not consult `is_active` / `is_paused` here — those
 * are enforced at REST level (login + status transitions); the socket merely
 * mirrors what the REST layer is willing to give the user.
 *
 * Payload shape: REST DTOs (`OrderAdminResponse` / `OrderCourierResponse` /
 * `CourierAdminResponse`) so the admin UI and Android client can update local
 * state without an additional mapper.
 *
 * Single instance, no Redis adapter — out of scope for this self-hosted
 * deployment (§16 multi-tenancy not done; one container per tenant).
 */
@WebSocketGateway({
  namespace: '/realtime',
  // Dev: admin runs on :3000, backend on :8081 — same-host different ports.
  // Stage 5 will tighten the origin via env once docker-compose lands.
  cors: { origin: '*' },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server): void {
    // Namespace-level handshake auth. Runs once per connection before
    // `handleConnection`. Rejection here surfaces as `connect_error` on the
    // client side so wrong/expired tokens are visible at the connect step,
    // not as silent missing events.
    server.use((socket: Socket, next) => {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('Unauthorized: missing token'));
      }
      try {
        const payload = this.jwtService.verify<{
          sub: unknown;
          role: unknown;
        }>(token);
        if (
          typeof payload.sub !== 'string' ||
          payload.sub.length === 0 ||
          !isRole(payload.role)
        ) {
          return next(new Error('Unauthorized: malformed payload'));
        }
        // socket.data is typed as Record<string, unknown> by socket.io —
        // we attach the principal here for handleConnection to read.
        (socket.data as SocketData).user = {
          sub: payload.sub,
          role: payload.role,
        };
        next();
      } catch {
        // jwtService.verify throws on bad signature, expiry, malformed JWT —
        // collapse them all into a single "Unauthorized" so we don't leak
        // the reason to the client.
        next(new Error('Unauthorized: invalid token'));
      }
    });
  }

  handleConnection(socket: Socket): void {
    const user = (socket.data as SocketData).user;
    // Belt-and-braces: middleware should have populated this; if it didn't,
    // disconnect rather than letting an unauth socket sit idle.
    if (!user) {
      socket.disconnect(true);
      return;
    }
    const room = user.role === 'admin' ? 'admin' : `courier:${user.sub}`;
    void socket.join(room);
    this.logger.debug(`socket ${socket.id} joined ${room}`);
  }

  handleDisconnect(socket: Socket): void {
    // Socket.IO removes the socket from rooms automatically; nothing to do.
    this.logger.debug(`socket ${socket.id} disconnected`);
  }

  // ── Public emit API ────────────────────────────────────────────────────────
  // High-level methods so callers don't repeat event names or maps. Each
  // method matches a domain transition; the gateway picks rooms and event
  // strings.

  /**
   * Generic "this order changed" — admin only. Fired on:
   * - PATCH /admin/orders/:id (edit before assign)
   * - PUT /courier/orders/:id/status (every transition, including `returned`)
   */
  emitOrderUpdated(order: Order): void {
    this.server
      .to('admin')
      .emit('orders:updated', toOrderAdminResponse(order, []));
  }

  /**
   * "Order was just assigned to a courier" — admin sees `orders:updated`,
   * the assigned courier sees `orders:new`. Fired on:
   * - POST /admin/orders (create + auto-assign succeeded)
   * - PUT /courier/orders/:id/status → `returned` (queue drainer attached
   *   the next queued order to the just-returned courier)
   * - POST /admin/couriers/:id/resume (drainer attached an order to the
   *   resumed courier)
   *
   * If `courierId` is null we still emit `orders:updated` for visibility but
   * skip the courier event — should not happen for this method's contract,
   * but kept defensive.
   */
  emitOrderAssigned(order: Order): void {
    this.server
      .to('admin')
      .emit('orders:updated', toOrderAdminResponse(order, []));
    if (order.courierId) {
      this.server
        .to(`courier:${order.courierId}`)
        .emit('orders:new', toOrderCourierResponse(order, []));
    }
  }

  /**
   * "Admin reassigned an order" — admin sees `orders:updated`. The previous
   * courier (if any) gets `orders:reassigned` so their UI drops the order
   * from the active list. The new courier gets either:
   * - `orders:reassigned` if the order was already on someone — UI swaps
   *   it into the active list silently,
   * - `orders:new` if the order had no courier before (`previousCourierId
   *   === null`) — same shape as auto-assign / queue drain, so the
   *   Android client surfaces the Snackbar.
   *
   * Fired on POST /admin/orders/:id/reassign and the `auto-assign`
   * endpoint (which routes through `reassign`).
   */
  emitOrderReassigned(order: Order, previousCourierId: string | null): void {
    this.server
      .to('admin')
      .emit('orders:updated', toOrderAdminResponse(order, []));
    const courierPayload = toOrderCourierResponse(order, []);
    if (previousCourierId && previousCourierId !== order.courierId) {
      this.server
        .to(`courier:${previousCourierId}`)
        .emit('orders:reassigned', courierPayload);
    }
    if (order.courierId) {
      // No previous owner → this is a first-time assignment from the
      // courier's perspective. Match the auto-assign event shape so the
      // Android client treats it the same way.
      const event = previousCourierId ? 'orders:reassigned' : 'orders:new';
      this.server.to(`courier:${order.courierId}`).emit(event, courierPayload);
    }
  }

  /**
   * "Order was cancelled" (courier or admin) — admin sees `orders:updated` so
   * the row flips to `cancelled`. The courier who held it (if any) gets
   * `orders:cancelled` to drop it from their active list. The freshly drained
   * queue order, if any, is emitted separately via `emitOrderAssigned`.
   */
  emitOrderCancelled(order: Order, previousCourierId: string | null): void {
    this.server
      .to('admin')
      .emit('orders:updated', toOrderAdminResponse(order, []));
    if (previousCourierId) {
      this.server
        .to(`courier:${previousCourierId}`)
        .emit('orders:cancelled', toOrderCourierResponse(order, []));
    }
  }

  /**
   * Courier admin row changed (pause / resume / soft-delete) — admin only.
   * Payload is the full `CourierAdminResponse` so the live couriers table can
   * patch the row in place.
   */
  emitCourierStatus(courier: CourierAdminResponse): void {
    this.server.to('admin').emit('couriers:status', courier);
  }
}

// ── Module-private helpers ───────────────────────────────────────────────────

interface SocketData {
  user?: { sub: string; role: Role };
}

function extractToken(socket: Socket): string | undefined {
  // Standard socket.io v4 auth channel: `io(url, { auth: { token } })`. We
  // intentionally do NOT also accept Authorization headers — keeping a single
  // documented channel avoids surprises across web/Android clients.
  const auth = socket.handshake.auth as { token?: unknown } | undefined;
  if (auth && typeof auth.token === 'string' && auth.token.length > 0) {
    return auth.token;
  }
  return undefined;
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'courier';
}

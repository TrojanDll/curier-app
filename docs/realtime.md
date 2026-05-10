# Realtime — Backend Reference

NestJS `RealtimeModule` + `RealtimeGateway` (Stage 2.9). Source: `backend/src/realtime/`.

## Topology

- One Socket.IO server, attached to the same HTTP listener as REST (`PORT=8081`).
- Namespace **`/realtime`** — non-namespaced clients are rejected.
- Single instance, no Redis adapter (multi-tenancy is out of scope per §16).
- CORS during dev: `origin: '*'`. Stage 5 will tighten this via env once
  docker-compose lands.

## Handshake auth

Clients open the socket with the access JWT in `auth.token`:

```js
import { io } from 'socket.io-client';
const socket = io('http://server-host:8081/realtime', {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

A namespace-level middleware verifies the HS256 signature with `JWT_SECRET`,
re-checks `payload.sub`/`payload.role`, and either:

- attaches `{ sub, role }` to `socket.data.user`, lets the connection through, OR
- calls `next(new Error('Unauthorized: ...'))` — surfaces as `connect_error` on
  the client.

On successful connect, `handleConnection` joins exactly one room based on role:

| Role | Room |
|---|---|
| `admin` | `admin` |
| `courier` | `courier:<sub>` |

The gateway does **not** consult `is_active` / `is_paused` here — REST already
enforces those at login and on each transition. The socket only mirrors what
REST is willing to give the user.

Auth header (`Authorization: Bearer ...`) is intentionally **not** accepted.
One documented channel keeps web/Android clients consistent.

## Events

All events carry the same DTO shape as the corresponding REST endpoint, so
clients can patch local state without an extra mapper.

| Event | Direction | Payload | Fired on |
|---|---|---|---|
| `orders:updated` | server → `admin` | `OrderAdminResponse` (photos: `[]`) | order create / update / reassign / every status transition |
| `orders:new` | server → `courier:<id>` | `OrderCourierResponse` (photos: `[]`) | auto-assign on create, queue drainer on `returned`, queue drainer on resume |
| `orders:reassigned` | server → `courier:<id>` | `OrderCourierResponse` (photos: `[]`) | admin reassigns the order — fired to **both** previous and new courier |
| `couriers:status` | server → `admin` | `CourierAdminResponse` | pause / resume / soft-delete |

`photos` is always emitted as `[]` even on detail-style transitions. Clients
that need photo metadata refetch the order via REST after the event.

## Trigger map

These are all the points where the gateway is invoked from feature services.
Keep this in sync with `backend/src/orders/orders.service.ts` and
`backend/src/couriers/couriers.service.ts`.

| Source | Trigger | Gateway call |
|---|---|---|
| `OrdersService.create` | auto-assign succeeded | `emitOrderAssigned(order)` |
| `OrdersService.create` | auto-assign found nobody | `emitOrderUpdated(order)` |
| `OrdersService.update` | admin edits a `new` order | `emitOrderUpdated(order)` |
| `OrdersService.reassign` | admin reassigns | `emitOrderReassigned(order, previousCourierId)` |
| `OrdersService.updateStatus` | any forward transition incl. `returned` | `emitOrderUpdated(order)` |
| `OrdersService.updateStatus` (`returned`) | drainer pulled a queued order | `emitOrderAssigned(drained)` |
| `CouriersService.pause` | admin pauses | `emitCourierStatus(courier)` |
| `CouriersService.resume` | admin resumes | `emitCourierStatus(courier)` + `emitOrderAssigned(drained)` if drainer fired |
| `CouriersService.softDelete` | admin "fires" courier | `emitCourierStatus(courier)` |

## Gateway public API

The gateway exposes high-level methods so callers don't repeat event names or
room maps:

```ts
emitOrderUpdated(order: Order): void
emitOrderAssigned(order: Order): void                                   // admin + courier
emitOrderReassigned(order: Order, previousCourierId: string | null): void // admin + ≤2 couriers
emitCourierStatus(courier: CourierAdminResponse): void
```

Mappers live in `orders/order.mappers.ts` (extracted from `OrdersService` so
the gateway can use them without a circular import).

## What is NOT here yet

- Redis adapter for multi-instance fan-out — out of scope (§16, single-instance per tenant).
- Origin allowlist via env — comes with Stage 5 (Docker compose).
- Disconnect-side bookkeeping (e.g. mark courier offline) — not in §9; Socket.IO
  removes sockets from rooms automatically.
- WS guard for incoming client → server messages — the gateway is server →
  client only at this stage.

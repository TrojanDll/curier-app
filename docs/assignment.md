# Assignment — Backend Reference

NestJS `AssignmentModule` (Stage 2.6). Source: `backend/src/assignment/`.

The module owns the auto-assign + queue-drain algorithm from §8 of
`Documentation/completion_plan.md`. It exposes no HTTP endpoints — its
service is invoked by `OrdersService` and `CouriersService` after their
primary operations commit.

## Trigger points

| Trigger | Caller | Method | Effect |
|---|---|---|---|
| Order created | `OrdersService.create` | `tryAssignNewOrder(orderId)` | Hand the new order to the longest-at-base eligible courier; otherwise leave it `status='new'`. |
| Courier returns to base | `OrdersService.updateStatus` (target=`returned`) | `tryAssignToFreeCourier(courierId)` | Drain one queued `new` order to this courier. |
| Paused courier resumed | `CouriersService.resume` | `tryAssignToFreeCourier(courierId)` | Drain one queued `new` order to this courier. |

Reactivation of a soft-deleted courier (`is_active=false → true`) is **not** wired up — there is no `restore` endpoint yet (see §15.2 / future Stage 4 extension). When it lands, it must call `tryAssignToFreeCourier` too.

## Eligibility (§8 algorithm)

A courier is eligible to receive an order iff:
1. `is_active = true` AND `is_paused = false`.
2. They have **no** order in `{assigned, picked_up, near_customer, delivered}` (those statuses mean the courier physically holds an order).

Among eligible couriers, the queue prefers:
1. **Smallest `last_returned_at`** — longest time at base. `NULL` is treated as "even longer than any non-null timestamp" via Postgres `NULLS FIRST`.
2. Tie-break by **smallest `createdAt`** — couriers hired earlier come first when both have `lastReturnedAt = NULL` (or both have the exact same timestamp).

Composite index `(is_active, is_paused, last_returned_at)` from the init migration covers the lookup.

## Concurrency control

Two layers, both required:

### 1. Postgres advisory transaction lock

```sql
SELECT pg_advisory_xact_lock(hashtext('curier:assign'));
```

Issued as the first statement of every `tryAssign*` transaction. Serialises **all** auto-assign passes across the whole backend instance, so two concurrent triggers can never both pick the same courier.

The lock is released automatically on transaction commit/rollback (`xact_lock`, not the session-level variant). It does not affect any non-assignment write — the keyspace `hashtext('curier:assign')` is owned exclusively by this code.

Cost: a couple of microseconds per pass; assignment frequency is bounded by the rate of admin order-creation + courier returns, so contention is negligible.

### 2. CAS on the order row

```sql
UPDATE orders SET courier_id=…, status='assigned', assigned_at=now()
WHERE id=$1 AND status='new';
```

via Prisma `updateMany({ where: { id, status: 'new' } })` — checks `count === 1`. This is defence-in-depth: even if the lock somehow let two writers through (it shouldn't), only one of them flips the row. It also covers the case where an admin reassigned the order between `OrdersService.create` and the lock acquisition.

### Why not `SELECT … FOR UPDATE SKIP LOCKED`?

That pattern shines for **multi-worker** queue draining — many independent processes pulling from the same queue. Here we have a single backend instance with cooperative triggers; advisory lock is simpler and avoids the `$queryRaw` round-trip for row-level locks. If we ever scale to multiple backend replicas the advisory lock still works (it's database-wide), only the contention model shifts.

## Error policy

`tryAssign*` methods are wrapped in a top-level `try/catch`. On any thrown error:

- The error is logged via `Logger.error` (pino in production, pino-pretty in dev).
- The method returns `null`.
- The caller's primary action — `order.create` / `updateStatus` / `resume` — has already committed and is **not** rolled back.

Net effect: a failed auto-assign leaves the order as `status='new'` in the queue. The next trigger (next create / return / resume) will retry the drain. No queue position is lost.

## Internal API

```ts
class AssignmentService {
  /** §8 trigger #1: new order → longest-at-base eligible courier. */
  tryAssignNewOrder(orderId: string): Promise<Order | null>;

  /** §8 triggers #2/#3: drain one queued order to the now-free courier. */
  tryAssignToFreeCourier(courierId: string): Promise<Order | null>;
}
```

Both return the **updated `Order` row** on success and `null` otherwise. `OrdersService.create` uses the returned row to surface the post-assign state in the admin response — so a successful auto-assign yields a 201 already containing `status='assigned'`, `courierId`, `assignedAt`.

## What is NOT here yet

- Realtime push (`orders:new` over Socket.IO) when assignment lands → Stage 2.9. The natural integration point is right after the CAS-update succeeds.
- Reactivation trigger (`is_active=false → true`) — depends on a future `POST /api/admin/couriers/:id/restore`.
- Metrics: queue length, mean queue wait time, per-courier assignment counts → could feed StatisticsModule (2.8).

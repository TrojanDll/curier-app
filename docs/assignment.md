# Assignment — Backend Reference

NestJS `AssignmentModule` (Stage 2.6). Source: `backend/src/assignment/`.

The module owns the auto-assign + queue-drain algorithm from §8 of
`Documentation/completion_plan.md`. It exposes no HTTP endpoints — its
service is invoked by `OrdersService` and `CouriersService` after their
primary operations commit.

## Trigger points

| Trigger | Caller | Method | Effect |
|---|---|---|---|
| Order created | `OrdersService.create` | `tryAssignNewOrder(orderId)` | Score the eligible pool for the order's `priority` and assign the highest-scoring courier; otherwise leave it `status='new'`. |
| Courier returns to base | `OrdersService.updateStatus` (target=`returned`) | `tryAssignToFreeCourier(courierId)` | Drain the **highest-priority** queued order (`priority DESC, created_at ASC`) to this courier. |
| Paused courier resumed | `CouriersService.resume` | `tryAssignToFreeCourier(courierId)` | Drain the highest-priority queued order to this courier. |

Reactivation of a soft-deleted courier (`is_active=false → true`) is **not** wired up — there is no `restore` endpoint yet (see §15.2 / future Stage 4 extension). When it lands, it must call `tryAssignToFreeCourier` too.

## Eligibility (§8 algorithm)

A courier is eligible to receive an order iff:
1. `is_active = true` AND `is_paused = false`.
2. They have **no** order in `{assigned, picked_up, near_customer, delivered}` (those statuses mean the courier physically holds an order).

The eligibility predicate is unchanged from the original single-key design. What changed is **how eligible couriers are ranked** — see Scoring below.

## Scoring (weighted multi-criteria)

The legacy rule ranked eligible couriers by a single key (smallest
`last_returned_at` = longest at base). It optimised *fairness of idle time*
and ignored everything else: a slow or brand-new courier outranked a fast,
seasoned one purely for having idled a few seconds longer.

`scoring.ts` (pure, unit-tested in `scoring.spec.ts`) replaces that with a
weighted sum of four factors, each **min-max normalised to `[0..1]` across
the candidate pool** so they're comparable despite different units:

| Factor | Raw metric | Direction | Source |
|---|---|---|---|
| `idle` | `now − last_returned_at` (fallback `created_at`) | higher = better | `couriers` row |
| `speed` | mean `delivered_at − assigned_at` over history | lower = better; no history → neutral 0.5 | `orders` history |
| `fairness` | orders taken since 00:00 UTC today | lower = better | `orders` today |
| `experience` | lifetime completed deliveries | higher = better | `orders` history |

```
score(courier) = Σ wᵢ · factorᵢ        (each factorᵢ ∈ [0..1])
```

`idle` alone reproduces the legacy behaviour, so the old algorithm is a
special case of this one (weights `idle=1`, rest `0`).

### Normalisation

Each factor is min-max normalised **across the current candidate pool**, so a
factor only ever measures a courier *relative to the others competing for this
order* — absolute units (seconds, counts) never enter the weighted sum.

```
higher = better:   factor(v) = (v − min) / (max − min)
lower  = better:   factor(v) = 1 − (v − min) / (max − min)
```

where `min`/`max` are taken over the non-null raw values in the pool. Three
cases collapse to the neutral score **0.5** (the factor cannot separate the
candidates, so it neither rewards nor punishes):

- **`v` is null** — no data for that courier on that factor. Only `speed` can be
  null (a courier with zero completed deliveries has no average duration);
  `idle`/`fairness`/`experience` always have a value.
- **`max == min`** — every present value is equal (e.g. nobody has taken an
  order today → all `fairness` raw values are 0).
- **pool of one** — a single eligible courier scores 0.5 on every factor, so
  `score = 0.5 · Σwᵢ = 0.5`, and they win by default.

This is `normalizeMinMax()` in `scoring.ts`; `NEUTRAL_SCORE = 0.5`.

### Priority-dependent weights

The weight profile depends on the order's `priority` (`WEIGHTS_BY_PRIORITY`,
each profile sums to 1.0 → total score stays in `[0..1]`):

| priority | idle | speed | fairness | experience | intent |
|---|---|---|---|---|---|
| `low` | 0.45 | 0.10 | 0.35 | 0.10 | even rotation |
| `normal` | 0.40 | 0.20 | 0.30 | 0.10 | rotation, mild speed bias |
| `high` | 0.15 | 0.40 | 0.10 | 0.35 | urgent → fastest + most experienced |

Ties on the total break by `created_at asc` (earlier hire), preserving the
legacy tie-break and keeping selection deterministic.

### Worked example

Three eligible couriers compete for one order. Raw metrics:

| courier | idle (h) | avg delivery (min) | orders today | completed |
|---|---|---|---|---|
| A | 5 | 40 | 3 | 80 |
| B | 1 | 20 | 1 | 120 |
| C | 8 | 60 | 0 | 10 |

Min-max normalised over the pool (`idle`/`experience` higher-better,
`speed`/`fairness` lower-better):

| courier | idle | speed | fairness | experience |
|---|---|---|---|---|
| A | 0.571 | 0.500 | 0.000 | 0.636 |
| B | 0.000 | 1.000 | 0.667 | 1.000 |
| C | 1.000 | 0.000 | 1.000 | 0.000 |

Now the **same pool** resolves differently depending on the order's priority:

**`high`** (idle .15 / speed .40 / fairness .10 / experience .35):

```
A = .15·.571 + .40·.500 + .10·.000 + .35·.636 = 0.51
B = .15·.000 + .40·1.000 + .10·.667 + .35·1.000 = 0.82   ← winner
C = .15·1.000 + .40·.000 + .10·1.000 + .35·.000 = 0.25
```

**`normal`** (idle .40 / speed .20 / fairness .30 / experience .10):

```
A = .40·.571 + .20·.500 + .30·.000 + .10·.636 = 0.39
B = .40·.000 + .20·1.000 + .30·.667 + .10·1.000 = 0.50
C = .40·1.000 + .20·.000 + .30·1.000 + .10·.000 = 0.70   ← winner
```

Same three couriers, opposite outcome. An **urgent** order goes to **B** — fast
(20 min avg) and seasoned (120 deliveries) — even though they just got back and
already carry today's load. A **normal** order goes to **C** — longest at base
and zero load today — i.e. the fairness-driven rotation the legacy algorithm
always did. That priority-driven branch is the whole point of the design.

### Why `experience`, not a success rate?

A reliability factor would ideally be "% of deliveries that succeeded", but
the data model has **no failed-delivery state** — `…→delivered→returned`
always runs to completion (`returned` = back at base, not a failure). With no
failures to count, a success rate is undefined, so we use lifetime completed
deliveries as an experience/reliability proxy. Adding a real failure/cancel
state is the natural upgrade (see below).

### Metrics gathering

`AssignmentService.gatherCandidateMetrics` runs two reads over the (small)
eligible pool: the delivered-order history (durations + completed count) and
a `groupBy` of orders taken today. Averages are computed in code so the
policy stays Prisma-free and unit-testable. The pool is bounded by the number
of *free* couriers, so the history scan is small in practice; a time window or
a denormalised per-courier rollup is the place to optimise if volume grows.

## Queue ordering (priority)

`tryAssignToFreeCourier` no longer drains strict FIFO. It picks the most
deserving queued order — `ORDER BY priority DESC, created_at ASC` — so urgent
jobs jump the line, oldest-first within a tier. The composite index
`(status, priority, created_at)` (migration `add_order_priority`) covers it.
There is a single candidate courier here (the one that just freed up), so no
courier scoring runs on this path — the priority decision is order-side.

## How a full pass runs

`tryAssignNewOrder(orderId)` — the new-order path, scoring couriers — step by
step (all inside one Prisma transaction):

1. **Lock.** `pg_advisory_xact_lock(hashtext('curier:assign'))` — serialise every
   auto-assign pass instance-wide (Concurrency below).
2. **Re-read the order.** If it is no longer `status='new'` (an admin grabbed it
   first) → return `null`, leave it alone.
3. **Load the eligible pool.** `couriers` where active, not paused, zero busy
   orders. Empty pool → return `null`; the order stays queued.
4. **Gather metrics.** `gatherCandidateMetrics`: delivered-order history
   (durations → `speed`, count → `experience`) + today's order count
   (`fairness`); `idle` comes off the courier row.
5. **Score & rank.** Normalise each factor over the pool, apply the weight
   profile for *this order's priority*, sum, sort best-first (ties → earliest
   `created_at`).
6. **CAS the winner.** `UPDATE … SET courier_id, status='assigned', assigned_at
   WHERE id=$1 AND status='new'`. If the guarded update touched 0 rows (lost a
   race) → return `null`.
7. **Return** the updated order, which `OrdersService.create` surfaces in the
   201 response.

`tryAssignToFreeCourier(courierId)` — the queue-drain path — is the mirror
image: lock → re-verify the courier is still eligible → pick the highest-priority
queued order (`priority DESC, created_at ASC`) → CAS it onto the courier. No
courier scoring (only one candidate); the decision is which *order* to hand over.

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
  /** §8 trigger #1: new order → highest-scoring eligible courier for its priority. */
  tryAssignNewOrder(orderId: string): Promise<Order | null>;

  /** §8 triggers #2/#3: drain the highest-priority queued order to the now-free courier. */
  tryAssignToFreeCourier(courierId: string): Promise<Order | null>;

  /** Admin "Назначить автоматически": best eligible courier id for a priority,
   *  optionally excluding one courier. Read-only (no lock). Null if none free. */
  findBestEligibleForOrder(
    priority: OrderPriority,
    excludeCourierId?: string | null,
  ): Promise<string | null>;
}
```

Both return the **updated `Order` row** on success and `null` otherwise. `OrdersService.create` uses the returned row to surface the post-assign state in the admin response — so a successful auto-assign yields a 201 already containing `status='assigned'`, `courierId`, `assignedAt`.

## What is NOT here yet

- Realtime push (`orders:new` over Socket.IO) when assignment lands → Stage 2.9. The natural integration point is right after the CAS-update succeeds.
- Reactivation trigger (`is_active=false → true`) — depends on a future `POST /api/admin/couriers/:id/restore`.
- Metrics: queue length, mean queue wait time, per-courier assignment counts → could feed StatisticsModule (2.8).

### Scorer extensions (future)

- **Real reliability factor** — needs a failed/cancelled delivery state in the
  model; then `experience` can become a true success rate.
- **Geo / distance factor** — the strongest signal for a courier app, but the
  schema stores `delivery_address` as free text with no coordinates. Requires
  geocoding + a courier position/home-zone column before distance can weigh in.
- **Admin-tunable weights** — `WEIGHTS_BY_PRIORITY` is currently a code
  constant; it could move to `AppSettings` (singleton row already exists) so a
  dispatcher can retune the strategy at runtime.
- **Batch matching** — when several couriers free up against several queued
  orders, the per-event greedy pass is locally optimal, not globally. A
  Hungarian-algorithm assignment over the (courier × order) score matrix would
  be globally optimal; overkill for the current single-instance, event-driven
  drain but the natural scale-up.

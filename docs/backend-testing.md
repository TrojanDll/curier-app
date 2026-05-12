# Backend — Unit Testing Reference

Pattern for `*.spec.ts` files run by Jest under `cd backend && npx jest`
(or `npm test`). Integration / e2e coverage lives separately in §14.7.3.

## Toolchain

| Library | Use |
|---|---|
| `jest` | Test runner (config inline in `backend/package.json` → `jest` key) |
| `ts-jest` | TS transform |
| `@nestjs/testing` | `Test.createTestingModule(...)` for module-level DI |

`testRegex` = `.*\\.spec\\.ts$`. Place spec files next to the unit they
cover (`order-transitions.spec.ts` lives alongside `order-transitions.ts`).

## Extract-then-test pattern

The auto-assign + status-transition logic was originally private to
`OrdersService` / `AssignmentService`. To test it without Prisma we
extracted the *policy* (pure constants + predicates + comparators) into
sibling modules:

| Module | What it owns |
|---|---|
| `orders/order-transitions.ts` | `COURIER_NEXT`, status sets, `STATUS_TIMESTAMP_FIELD`, `validateCourierTransition`, `getNextCourierStatus` |
| `orders/order-queries.ts` | `parseDateSafe`, `buildDateRange` |
| `assignment/eligibility.ts` | `COURIER_BUSY_STATUSES`, `isCourierEligible`, `compareLongestAtBase` |

Services consume these helpers; the **SQL / Prisma transaction** stays in
the service and is covered by integration tests (§14.7.3). When adding a
new business rule, prefer this split — service-as-thin-orchestrator over
service-as-god-class.

### `validateCourierTransition` returns a discriminated union

```ts
type TransitionResult =
  | { ok: true; timestampField: keyof Order }
  | { ok: false; reason: string };
```

`OrdersService.updateStatus` reads `decision.reason === 'Missing
timestamp mapping'` to pick `InternalServerErrorException`, otherwise
`ConflictException`. This keeps the mapping in one place and the service
side a tiny switch.

## Current coverage (§14.7.2)

| Spec | # tests | Notes |
|---|---|---|
| `auth/password.util.spec.ts` | 6 | bcrypt hashing + comparator (pre-existing) |
| `orders/order-transitions.spec.ts` | 13 | forward chain, every reject path, status-set sanity |
| `orders/order-queries.spec.ts` | 10 | parse + build, malformed input handling |
| `assignment/eligibility.spec.ts` | 12 | busy set, predicate truth-table, comparator ordering |

Run: `cd backend && npx jest --colors=false` (or `npm test`). Reports at
`backend/coverage/` after `npm run test:cov`.

## Integration / e2e (§14.7.3)

Layered on top of unit tests, the e2e suite under `backend/test/`
exercises the full HTTP stack against a real PostgreSQL.

### Layout

| File | Purpose |
|---|---|
| `jest-e2e.json` | Standalone Jest config; `maxWorkers: 1` to serialise DB writes |
| `global-setup.ts` | `prisma migrate deploy` on `curier_test` once per run |
| `setup-env.ts` | Pins `DATABASE_URL`, `JWT_SECRET`, silent pino, disables seed-on-boot |
| `test-utils.ts` | `bootTestApp` (mirrors main.ts pipes + prefix), `resetDatabase` (TRUNCATE + sequence reset), `seedAdmin`/`seedCourier` |
| `health.e2e-spec.ts` | `/health` liveness + `/api` prefix exemption |
| `auth.e2e-spec.ts` | admin/courier login (happy + 401 + 400), refresh rotation, logout revocation |
| `orders.e2e-spec.ts` | create + auto-assign, queued when none free, full transition chain, drain-on-return, 409s, RolesGuard, 401 unauth |

### One-time setup

The suite expects a database named `curier_test` on the dev Postgres
container:

```bash
docker exec curier_db_dev psql -U curier -d curier \
  -c "CREATE DATABASE curier_test"
```

After that, `global-setup.ts` keeps the schema migrated on every run.

### Running

```bash
cd backend
npm run test:e2e         # 20 tests, ~9s
```

Coverage: every secured controller is hit at least once with both a
valid token and the wrong role; every multi-step flow (auto-assign,
drain-on-return, reassign-409) is asserted end-to-end so a regression
in OrdersService/AssignmentService cannot pass CI silently.

## What's intentionally NOT covered here

Photo upload + the cleanup cron are excluded for now — multer fixtures
plus filesystem expectations doubled the spec size without buying much
beyond what `photos.service` unit-level testing would. Photo coverage
slots into a future §14.7.3 extension when needed.

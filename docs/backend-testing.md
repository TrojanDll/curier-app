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

## What's intentionally NOT covered here

Things that need a real DB or HTTP layer — `OrdersService.create`
(allocates `order_number` via `nextval`), the advisory lock + CAS inside
`AssignmentService`, validation pipe interplay with controllers. Those
go in §14.7.3 (integration / e2e against a disposable Postgres).

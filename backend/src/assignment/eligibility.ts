import { OrderStatus } from '@prisma/client';

/**
 * Pure eligibility + ordering rules used by AssignmentService (§14.7.2).
 *
 * The actual auto-assign happens inside a Prisma transaction holding a
 * Postgres advisory lock (`docs/assignment.md`), so the *query* shape
 * stays in the service. What's extracted here is the *policy*:
 *   - which order statuses keep a courier "busy",
 *   - what makes a courier eligible at the moment of selection,
 *   - how to rank multiple eligible couriers (longest at base).
 *
 * Tests against this file (`eligibility.spec.ts`) verify the policy in
 * isolation; integration tests (§14.7.3) cover the actual SQL.
 */

/** A courier is busy iff they own an order in any of these statuses. */
export const COURIER_BUSY_STATUSES: readonly OrderStatus[] = [
  OrderStatus.assigned,
  OrderStatus.picked_up,
  OrderStatus.near_customer,
  OrderStatus.delivered,
];

export function isOrderBusyForCourier(status: OrderStatus): boolean {
  return COURIER_BUSY_STATUSES.includes(status);
}

export interface EligibilityCourier {
  isActive: boolean;
  isPaused: boolean;
  /** Number of orders this courier currently holds in a busy status. */
  busyOrderCount: number;
}

/**
 * The selection predicate inside `findFirst({ where: ... })`. Encodes:
 *   - the courier is enabled (`isActive`),
 *   - not paused (`isPaused = false`),
 *   - has zero busy orders (`orders: { none: { status: ... busy } }`).
 */
export function isCourierEligible(courier: EligibilityCourier): boolean {
  return courier.isActive && !courier.isPaused && courier.busyOrderCount === 0;
}

export interface RankableCourier {
  lastReturnedAt: Date | null;
  createdAt: Date;
}

/**
 * Comparator that mirrors the Prisma `orderBy` used by AssignmentService:
 *   `[{ lastReturnedAt: 'asc' nulls 'first' }, { createdAt: 'asc' }]`.
 *
 *   - `lastReturnedAt = null` → ranked **first** (courier never returned;
 *     treated as having spent the longest at base since hiring).
 *   - among couriers who *have* returned, the oldest `lastReturnedAt`
 *     wins.
 *   - finally, ties break by hiring order (`createdAt asc`).
 *
 * Returns the standard Array.sort contract: negative if `a` ranks ahead.
 */
export function compareLongestAtBase(
  a: RankableCourier,
  b: RankableCourier,
): number {
  if (a.lastReturnedAt === null && b.lastReturnedAt !== null) return -1;
  if (a.lastReturnedAt !== null && b.lastReturnedAt === null) return 1;
  if (a.lastReturnedAt !== null && b.lastReturnedAt !== null) {
    const cmp = a.lastReturnedAt.getTime() - b.lastReturnedAt.getTime();
    if (cmp !== 0) return cmp;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

import { OrderStatus, type Order } from '@prisma/client';

/**
 * Pure-function transition rules used by OrdersService (§14.7.2). Extracted
 * so unit tests don't need to spin up Prisma — the data here is what the
 * courier-facing state machine actually depends on.
 *
 * Кросс-ссылки:
 * - `docs/orders.md` описывает forward-only flow assigned → … → returned.
 * - `docs/realtime.md` опирается на тот же STATUS_TIMESTAMP_FIELD при
 *   отправке `orders:updated`.
 */

/** Active = courier has it but hasn't returned to base yet. */
export const COURIER_ACTIVE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.assigned,
  OrderStatus.picked_up,
  OrderStatus.near_customer,
  OrderStatus.delivered,
];

/** History = finished (handed off or back at base). */
export const COURIER_HISTORY_STATUSES: readonly OrderStatus[] = [
  OrderStatus.delivered,
  OrderStatus.returned,
];

/** Reassign is only meaningful before the courier has physically picked up. */
export const REASSIGNABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.new,
  OrderStatus.assigned,
];

/** Forward-only courier transitions enforced by OrdersService.updateStatus. */
export const COURIER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.assigned]: OrderStatus.picked_up,
  [OrderStatus.picked_up]: OrderStatus.near_customer,
  [OrderStatus.near_customer]: OrderStatus.delivered,
  [OrderStatus.delivered]: OrderStatus.returned,
};

/** Maps a target status to the audit timestamp column to stamp on transition. */
export const STATUS_TIMESTAMP_FIELD: Record<OrderStatus, keyof Order | null> = {
  [OrderStatus.new]: null,
  [OrderStatus.assigned]: 'assignedAt',
  [OrderStatus.picked_up]: 'pickedUpAt',
  [OrderStatus.near_customer]: 'nearCustomerAt',
  [OrderStatus.delivered]: 'deliveredAt',
  [OrderStatus.returned]: 'returnedAt',
};

/** Result of evaluating a courier-requested transition. */
export type TransitionResult =
  | { ok: true; timestampField: keyof Order }
  | { ok: false; reason: string };

/**
 * Pure validator: given an order's *current* status and the *target* status
 * the courier asked for, decide whether the transition is allowed and which
 * timestamp column must be stamped. Returns a discriminated union so callers
 * pick between Conflict + Internal errors without re-checking the rules.
 */
export function validateCourierTransition(
  current: OrderStatus,
  target: OrderStatus,
): TransitionResult {
  const expectedNext = COURIER_NEXT[current];
  if (!expectedNext || expectedNext !== target) {
    return {
      ok: false,
      reason: `Cannot transition order from "${current}" to "${target}"`,
    };
  }
  const tsField = STATUS_TIMESTAMP_FIELD[target];
  if (!tsField) {
    return { ok: false, reason: 'Missing timestamp mapping' };
  }
  return { ok: true, timestampField: tsField };
}

/** Convenience helper for the Android client mirror tests / UI hints. */
export function getNextCourierStatus(
  current: OrderStatus,
): OrderStatus | undefined {
  return COURIER_NEXT[current];
}

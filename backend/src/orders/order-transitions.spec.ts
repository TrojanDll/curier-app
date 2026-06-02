import { OrderStatus } from '@prisma/client';
import {
  ADMIN_CANCELLABLE_STATUSES,
  COURIER_ACTIVE_STATUSES,
  COURIER_CANCELLABLE_STATUSES,
  COURIER_HISTORY_STATUSES,
  COURIER_NEXT,
  REASSIGNABLE_STATUSES,
  STATUS_TIMESTAMP_FIELD,
  getNextCourierStatus,
  validateCourierTransition,
} from './order-transitions';

/**
 * Pin the courier-facing state machine extracted from OrdersService (§14.7.2).
 * These tests guard against silent changes — e.g. someone reordering enum
 * values or dropping a status without realising it would let a courier skip
 * a transition.
 */
describe('order-transitions', () => {
  describe('COURIER_NEXT', () => {
    it('forward-only chain assigned → picked_up → near_customer → delivered → returned', () => {
      expect(COURIER_NEXT[OrderStatus.assigned]).toBe(OrderStatus.picked_up);
      expect(COURIER_NEXT[OrderStatus.picked_up]).toBe(
        OrderStatus.near_customer,
      );
      expect(COURIER_NEXT[OrderStatus.near_customer]).toBe(
        OrderStatus.delivered,
      );
      expect(COURIER_NEXT[OrderStatus.delivered]).toBe(OrderStatus.returned);
    });

    it('terminal/inaccessible statuses have no next', () => {
      expect(COURIER_NEXT[OrderStatus.new]).toBeUndefined();
      expect(COURIER_NEXT[OrderStatus.returned]).toBeUndefined();
      // Cancellation is a side-transition, never part of the forward chain.
      expect(COURIER_NEXT[OrderStatus.cancelled]).toBeUndefined();
    });
  });

  describe('validateCourierTransition', () => {
    it('returns ok with the right timestamp field for each valid step', () => {
      const cases: Array<[OrderStatus, OrderStatus, string]> = [
        [OrderStatus.assigned, OrderStatus.picked_up, 'pickedUpAt'],
        [OrderStatus.picked_up, OrderStatus.near_customer, 'nearCustomerAt'],
        [OrderStatus.near_customer, OrderStatus.delivered, 'deliveredAt'],
        [OrderStatus.delivered, OrderStatus.returned, 'returnedAt'],
      ];
      for (const [from, to, expectedField] of cases) {
        const result = validateCourierTransition(from, to);
        expect(result).toEqual({ ok: true, timestampField: expectedField });
      }
    });

    it('rejects backwards transitions with descriptive reason', () => {
      const r = validateCourierTransition(
        OrderStatus.delivered,
        OrderStatus.picked_up,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.reason).toBe(
          'Cannot transition order from "delivered" to "picked_up"',
        );
      }
    });

    it('rejects skipping a step (assigned → delivered)', () => {
      const r = validateCourierTransition(
        OrderStatus.assigned,
        OrderStatus.delivered,
      );
      expect(r.ok).toBe(false);
    });

    it('rejects no-op transitions to the same status', () => {
      const r = validateCourierTransition(
        OrderStatus.picked_up,
        OrderStatus.picked_up,
      );
      expect(r.ok).toBe(false);
    });

    it('rejects courier-initiated transitions from `new`', () => {
      // Couriers must never push status from new — that's auto-assign's job.
      const r = validateCourierTransition(
        OrderStatus.new,
        OrderStatus.assigned,
      );
      expect(r.ok).toBe(false);
    });

    it('rejects transitions out of the terminal `returned` state', () => {
      const r = validateCourierTransition(
        OrderStatus.returned,
        OrderStatus.delivered,
      );
      expect(r.ok).toBe(false);
    });

    it('does not allow cancellation via the forward machine', () => {
      // Cancellation is handled separately (applyCancellation), so the
      // forward-only validator must reject any → cancelled here.
      for (const from of COURIER_CANCELLABLE_STATUSES) {
        const r = validateCourierTransition(from, OrderStatus.cancelled);
        expect(r.ok).toBe(false);
      }
    });
  });

  describe('getNextCourierStatus', () => {
    it('mirrors COURIER_NEXT for valid sources', () => {
      expect(getNextCourierStatus(OrderStatus.assigned)).toBe(
        OrderStatus.picked_up,
      );
      expect(getNextCourierStatus(OrderStatus.delivered)).toBe(
        OrderStatus.returned,
      );
    });

    it('returns undefined for terminal/initial statuses', () => {
      expect(getNextCourierStatus(OrderStatus.new)).toBeUndefined();
      expect(getNextCourierStatus(OrderStatus.returned)).toBeUndefined();
    });
  });

  describe('status sets', () => {
    it('COURIER_ACTIVE_STATUSES covers everything between (exclusive of new) and returned', () => {
      expect([...COURIER_ACTIVE_STATUSES]).toEqual([
        OrderStatus.assigned,
        OrderStatus.picked_up,
        OrderStatus.near_customer,
        OrderStatus.delivered,
      ]);
    });

    it('COURIER_HISTORY_STATUSES covers closed cycles incl. cancelled', () => {
      expect([...COURIER_HISTORY_STATUSES]).toEqual([
        OrderStatus.delivered,
        OrderStatus.returned,
        OrderStatus.cancelled,
      ]);
    });

    it('REASSIGNABLE_STATUSES is limited to pre-pickup', () => {
      expect([...REASSIGNABLE_STATUSES]).toEqual([
        OrderStatus.new,
        OrderStatus.assigned,
      ]);
    });

    it('COURIER_CANCELLABLE_STATUSES covers held-but-not-delivered orders', () => {
      expect([...COURIER_CANCELLABLE_STATUSES]).toEqual([
        OrderStatus.assigned,
        OrderStatus.picked_up,
        OrderStatus.near_customer,
      ]);
    });

    it('ADMIN_CANCELLABLE_STATUSES additionally includes unassigned new', () => {
      expect([...ADMIN_CANCELLABLE_STATUSES]).toEqual([
        OrderStatus.new,
        OrderStatus.assigned,
        OrderStatus.picked_up,
        OrderStatus.near_customer,
      ]);
    });

    it('delivered/returned/cancelled are not cancellable', () => {
      for (const terminal of [
        OrderStatus.delivered,
        OrderStatus.returned,
        OrderStatus.cancelled,
      ]) {
        expect(ADMIN_CANCELLABLE_STATUSES).not.toContain(terminal);
        expect(COURIER_CANCELLABLE_STATUSES).not.toContain(terminal);
      }
    });

    it('cancelled maps to the cancelledAt timestamp column', () => {
      expect(STATUS_TIMESTAMP_FIELD[OrderStatus.cancelled]).toBe('cancelledAt');
    });

    it('every OrderStatus has a timestamp mapping (null or column)', () => {
      // Defence against adding a new OrderStatus value and forgetting to
      // extend STATUS_TIMESTAMP_FIELD — would manifest as a runtime
      // InternalServerErrorException in updateStatus.
      for (const s of Object.values(OrderStatus)) {
        expect(STATUS_TIMESTAMP_FIELD).toHaveProperty(s);
      }
    });
  });
});

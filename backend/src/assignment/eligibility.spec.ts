import { OrderStatus } from '@prisma/client';
import {
  COURIER_BUSY_STATUSES,
  compareLongestAtBase,
  isCourierEligible,
  isOrderBusyForCourier,
} from './eligibility';

/**
 * Pure-policy coverage for auto-assign eligibility + ordering (§14.7.2).
 * Matches the Prisma query AssignmentService uses but without touching the
 * DB — integration coverage is in §14.7.3.
 */
describe('eligibility', () => {
  describe('COURIER_BUSY_STATUSES / isOrderBusyForCourier', () => {
    it('considers assigned/picked_up/near_customer/delivered busy', () => {
      expect([...COURIER_BUSY_STATUSES]).toEqual([
        OrderStatus.assigned,
        OrderStatus.picked_up,
        OrderStatus.near_customer,
        OrderStatus.delivered,
      ]);
      for (const s of COURIER_BUSY_STATUSES) {
        expect(isOrderBusyForCourier(s)).toBe(true);
      }
    });

    it('treats new and returned as not busy', () => {
      // `new` = unassigned, `returned` = back at base — courier is free.
      expect(isOrderBusyForCourier(OrderStatus.new)).toBe(false);
      expect(isOrderBusyForCourier(OrderStatus.returned)).toBe(false);
    });
  });

  describe('isCourierEligible', () => {
    it('is true only when active, not paused, and zero busy orders', () => {
      expect(
        isCourierEligible({
          isActive: true,
          isPaused: false,
          busyOrderCount: 0,
        }),
      ).toBe(true);
    });

    it('is false when courier is disabled', () => {
      expect(
        isCourierEligible({
          isActive: false,
          isPaused: false,
          busyOrderCount: 0,
        }),
      ).toBe(false);
    });

    it('is false when courier is paused', () => {
      expect(
        isCourierEligible({
          isActive: true,
          isPaused: true,
          busyOrderCount: 0,
        }),
      ).toBe(false);
    });

    it('is false when courier already carries an order', () => {
      expect(
        isCourierEligible({
          isActive: true,
          isPaused: false,
          busyOrderCount: 1,
        }),
      ).toBe(false);
    });
  });

  describe('compareLongestAtBase', () => {
    const baseCreated = new Date('2026-01-01T00:00:00Z');
    const laterCreated = new Date('2026-02-01T00:00:00Z');

    it('null lastReturnedAt ranks ahead of any returned-once courier', () => {
      const fresh = { lastReturnedAt: null, createdAt: laterCreated };
      const returnedOnce = {
        lastReturnedAt: new Date('2026-04-01T00:00:00Z'),
        createdAt: baseCreated,
      };
      expect(compareLongestAtBase(fresh, returnedOnce)).toBeLessThan(0);
      expect(compareLongestAtBase(returnedOnce, fresh)).toBeGreaterThan(0);
    });

    it('among returned couriers, oldest lastReturnedAt wins', () => {
      const a = {
        lastReturnedAt: new Date('2026-04-01T00:00:00Z'),
        createdAt: baseCreated,
      };
      const b = {
        lastReturnedAt: new Date('2026-04-02T00:00:00Z'),
        createdAt: baseCreated,
      };
      expect(compareLongestAtBase(a, b)).toBeLessThan(0);
    });

    it('ties on lastReturnedAt break by createdAt (hiring order)', () => {
      const ts = new Date('2026-04-10T00:00:00Z');
      const hiredEarlier = { lastReturnedAt: ts, createdAt: baseCreated };
      const hiredLater = { lastReturnedAt: ts, createdAt: laterCreated };
      expect(compareLongestAtBase(hiredEarlier, hiredLater)).toBeLessThan(0);
    });

    it('two fresh couriers (both null) break ties by createdAt', () => {
      const a = { lastReturnedAt: null, createdAt: baseCreated };
      const b = { lastReturnedAt: null, createdAt: laterCreated };
      expect(compareLongestAtBase(a, b)).toBeLessThan(0);
    });

    it('full ranking sorts via Array.sort end-to-end', () => {
      // freshA — null, baseCreated
      // freshB — null, laterCreated
      // returnedC — returnedAt earlier, baseCreated
      // returnedD — returnedAt later, baseCreated
      // Expected rank: freshA, freshB, returnedC, returnedD.
      const freshA = { id: 'A', lastReturnedAt: null, createdAt: baseCreated };
      const freshB = {
        id: 'B',
        lastReturnedAt: null,
        createdAt: laterCreated,
      };
      const returnedC = {
        id: 'C',
        lastReturnedAt: new Date('2026-04-01T00:00:00Z'),
        createdAt: baseCreated,
      };
      const returnedD = {
        id: 'D',
        lastReturnedAt: new Date('2026-04-02T00:00:00Z'),
        createdAt: baseCreated,
      };
      const ranked = [returnedD, freshB, returnedC, freshA].sort(
        compareLongestAtBase,
      );
      expect(ranked.map((c) => c.id)).toEqual(['A', 'B', 'C', 'D']);
    });
  });
});

import { OrderPriority } from '@prisma/client';
import {
  CandidateMetrics,
  NEUTRAL_SCORE,
  WEIGHTS_BY_PRIORITY,
  idleSeconds,
  normalizeMinMax,
  pickBestCandidate,
  rankCandidates,
} from './scoring';

/**
 * Pure-policy coverage for the weighted multi-criteria scorer (§14.7.2).
 * No Prisma, no real clock — AssignmentService supplies the raw metrics.
 */
describe('scoring', () => {
  const now = new Date('2026-05-29T12:00:00Z');
  const hired = new Date('2026-01-01T00:00:00Z');

  // Minimal candidate with overridable fields.
  function candidate(over: Partial<CandidateMetrics>): CandidateMetrics {
    return {
      courierId: 'c',
      lastReturnedAt: null,
      createdAt: hired,
      avgDeliverySeconds: null,
      completedDeliveries: 0,
      ordersToday: 0,
      ...over,
    };
  }

  describe('WEIGHTS_BY_PRIORITY', () => {
    it('every profile sums to 1.0', () => {
      for (const p of Object.values(OrderPriority)) {
        const w = WEIGHTS_BY_PRIORITY[p];
        const sum = w.idle + w.speed + w.fairness + w.experience;
        expect(sum).toBeCloseTo(1.0, 10);
      }
    });

    it('high priority weights speed+experience above idle+fairness', () => {
      const high = WEIGHTS_BY_PRIORITY.high;
      expect(high.speed + high.experience).toBeGreaterThan(
        high.idle + high.fairness,
      );
    });

    it('normal priority weights idle+fairness above speed+experience', () => {
      const normal = WEIGHTS_BY_PRIORITY.normal;
      expect(normal.idle + normal.fairness).toBeGreaterThan(
        normal.speed + normal.experience,
      );
    });
  });

  describe('idleSeconds', () => {
    it('uses lastReturnedAt when present', () => {
      const c = candidate({
        lastReturnedAt: new Date('2026-05-29T11:00:00Z'),
      });
      expect(idleSeconds(c, now)).toBe(3600);
    });

    it('falls back to createdAt when never returned', () => {
      const c = candidate({ lastReturnedAt: null, createdAt: hired });
      expect(idleSeconds(c, now)).toBeGreaterThan(0);
      // ~149 days in seconds — just assert it used createdAt, not 0.
      expect(idleSeconds(c, now)).toBe((now.getTime() - hired.getTime()) / 1000);
    });

    it('never goes negative for a future timestamp', () => {
      const c = candidate({ lastReturnedAt: new Date('2026-06-01T00:00:00Z') });
      expect(idleSeconds(c, now)).toBe(0);
    });
  });

  describe('normalizeMinMax', () => {
    it('higherIsBetter maps max→1, min→0', () => {
      expect(normalizeMinMax([10, 20, 30], true)).toEqual([0, 0.5, 1]);
    });

    it('lowerIsBetter inverts: min→1, max→0', () => {
      expect(normalizeMinMax([10, 20, 30], false)).toEqual([1, 0.5, 0]);
    });

    it('all-equal column collapses to neutral', () => {
      expect(normalizeMinMax([5, 5, 5], true)).toEqual([
        NEUTRAL_SCORE,
        NEUTRAL_SCORE,
        NEUTRAL_SCORE,
      ]);
    });

    it('null entries map to neutral, others normalise over present values', () => {
      // present = [10, 30] → min 10, max 30; null → neutral.
      expect(normalizeMinMax([10, null, 30], true)).toEqual([
        0,
        NEUTRAL_SCORE,
        1,
      ]);
    });

    it('all-null column collapses to neutral', () => {
      expect(normalizeMinMax([null, null], false)).toEqual([
        NEUTRAL_SCORE,
        NEUTRAL_SCORE,
      ]);
    });
  });

  describe('rankCandidates', () => {
    it('returns [] for an empty pool', () => {
      expect(rankCandidates([], OrderPriority.normal, now)).toEqual([]);
    });

    it('single candidate scores neutral on every factor', () => {
      const ranked = rankCandidates(
        [candidate({ courierId: 'solo' })],
        OrderPriority.normal,
        now,
      );
      expect(ranked).toHaveLength(1);
      expect(ranked[0]?.factors).toEqual({
        idle: NEUTRAL_SCORE,
        speed: NEUTRAL_SCORE,
        fairness: NEUTRAL_SCORE,
        experience: NEUTRAL_SCORE,
      });
      // All factors 0.5, weights sum to 1 → total 0.5.
      expect(ranked[0]?.total).toBeCloseTo(0.5, 10);
    });

    it('high priority prefers the fast+experienced courier over the idle one', () => {
      // idleGuy idled longest but is slow & green; proGuy is fast & seasoned.
      const idleGuy = candidate({
        courierId: 'idle',
        lastReturnedAt: new Date('2026-05-01T00:00:00Z'), // very long idle
        avgDeliverySeconds: 3600, // slow
        completedDeliveries: 1,
        ordersToday: 0,
      });
      const proGuy = candidate({
        courierId: 'pro',
        lastReturnedAt: new Date('2026-05-29T11:50:00Z'), // idled little
        avgDeliverySeconds: 600, // fast
        completedDeliveries: 50, // seasoned
        ordersToday: 2,
      });
      const ranked = rankCandidates(
        [idleGuy, proGuy],
        OrderPriority.high,
        now,
      );
      expect(ranked[0]?.courierId).toBe('pro');
    });

    it('normal priority prefers the longest-idle courier (legacy behaviour)', () => {
      const idleGuy = candidate({
        courierId: 'idle',
        lastReturnedAt: new Date('2026-05-01T00:00:00Z'),
        avgDeliverySeconds: 3600,
        completedDeliveries: 1,
        ordersToday: 0,
      });
      const proGuy = candidate({
        courierId: 'pro',
        lastReturnedAt: new Date('2026-05-29T11:50:00Z'),
        avgDeliverySeconds: 600,
        completedDeliveries: 50,
        ordersToday: 2,
      });
      const ranked = rankCandidates(
        [idleGuy, proGuy],
        OrderPriority.normal,
        now,
      );
      expect(ranked[0]?.courierId).toBe('idle');
    });

    it('ties break by createdAt (earlier hire wins)', () => {
      // Two identical couriers except hire date → all factors equal → tie.
      const earlier = candidate({ courierId: 'early', createdAt: hired });
      const later = candidate({
        courierId: 'late',
        createdAt: new Date('2026-03-01T00:00:00Z'),
      });
      const ranked = rankCandidates(
        [later, earlier],
        OrderPriority.normal,
        now,
      );
      expect(ranked[0]?.courierId).toBe('early');
    });
  });

  describe('pickBestCandidate', () => {
    it('returns null for an empty pool', () => {
      expect(pickBestCandidate([], OrderPriority.normal, now)).toBeNull();
    });

    it('returns the top-ranked candidate', () => {
      const a = candidate({ courierId: 'a', ordersToday: 5 });
      const b = candidate({ courierId: 'b', ordersToday: 0 }); // lighter load
      const best = pickBestCandidate([a, b], OrderPriority.normal, now);
      expect(best?.courierId).toBe('b');
    });
  });
});

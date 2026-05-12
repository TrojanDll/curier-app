import { buildDateRange, parseDateSafe } from './order-queries';

/**
 * Pure-helper coverage for date-range query construction (§14.7.2).
 *
 * Validation of the ISO-8601 input format itself sits in the DTOs via
 * class-validator; here we lock down what the service does with whatever
 * `string | undefined` it actually receives.
 */
describe('order-queries', () => {
  describe('parseDateSafe', () => {
    it('returns undefined for undefined input', () => {
      expect(parseDateSafe(undefined)).toBeUndefined();
    });

    it('parses a valid ISO 8601 timestamp', () => {
      const d = parseDateSafe('2026-05-12T09:30:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d?.toISOString()).toBe('2026-05-12T09:30:00.000Z');
    });

    it('returns undefined for a clearly malformed string', () => {
      expect(parseDateSafe('not-a-date')).toBeUndefined();
    });

    it('returns undefined for an empty string (treated as absent)', () => {
      // Empty string falls through `if (!raw)` — same as undefined.
      expect(parseDateSafe('')).toBeUndefined();
    });
  });

  describe('buildDateRange', () => {
    it('returns undefined when both bounds are absent', () => {
      expect(buildDateRange(undefined, undefined)).toBeUndefined();
    });

    it('returns only gte when only `from` is supplied', () => {
      const f = buildDateRange('2026-05-01T00:00:00Z', undefined);
      expect(f).toEqual({
        gte: new Date('2026-05-01T00:00:00Z'),
      });
      expect(f).not.toHaveProperty('lte');
    });

    it('returns only lte when only `to` is supplied', () => {
      const f = buildDateRange(undefined, '2026-05-31T23:59:59Z');
      expect(f).toEqual({
        lte: new Date('2026-05-31T23:59:59Z'),
      });
      expect(f).not.toHaveProperty('gte');
    });

    it('returns gte + lte when both supplied', () => {
      const f = buildDateRange('2026-05-01T00:00:00Z', '2026-05-31T23:59:59Z');
      expect(f).toEqual({
        gte: new Date('2026-05-01T00:00:00Z'),
        lte: new Date('2026-05-31T23:59:59Z'),
      });
    });

    it('ignores malformed inputs while keeping valid ones', () => {
      // Mixed: one valid, one garbage — keep the valid bound, drop the bad.
      const f = buildDateRange('2026-05-01T00:00:00Z', 'garbage');
      expect(f).toEqual({ gte: new Date('2026-05-01T00:00:00Z') });
    });

    it('returns undefined when both inputs are malformed', () => {
      expect(buildDateRange('bad-from', 'bad-to')).toBeUndefined();
    });
  });
});

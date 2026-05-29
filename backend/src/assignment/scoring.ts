import { OrderPriority } from '@prisma/client';

/**
 * Weighted multi-criteria scorer for auto-assign (§8).
 *
 * The legacy rule was single-criterion: "longest at base" (smallest
 * `last_returned_at`). It optimises *fairness of idle time* and nothing
 * else — a slow or brand-new courier outranks a fast one purely because
 * they have idled a few seconds longer.
 *
 * This module ranks eligible couriers by a weighted sum of four factors,
 * each normalised to [0..1] across the candidate pool (min-max), so the
 * factors are comparable regardless of their natural units:
 *
 *   idle        — time since the courier was last free. Longer → better.
 *                 (Reproduces the old behaviour as one factor among four.)
 *   speed       — mean delivery duration (assigned → delivered) over history.
 *                 Faster → better. No history → neutral (don't punish a hire).
 *   fairness    — orders already taken in the current shift. Fewer → better.
 *                 Spreads load so one courier isn't run into the ground.
 *   experience  — lifetime completed deliveries. More → better. Used as a
 *                 reliability proxy: the data model has no "failed delivery"
 *                 state (returned = back at base, not a failure), so a true
 *                 success-rate cannot be computed — see docs/assignment.md.
 *
 * The weights depend on the order's `priority`: an urgent order leans on
 * speed + experience (give it to the best courier), while normal/low orders
 * keep the fairness-driven rotation the old algorithm provided.
 *
 * Everything here is pure (no Prisma, no clock) so it is unit-tested in
 * isolation (`scoring.spec.ts`); AssignmentService gathers the raw metrics
 * from the DB and feeds them in.
 */

/** Score assigned to a factor that cannot distinguish candidates. */
export const NEUTRAL_SCORE = 0.5;

export interface FactorWeights {
  idle: number;
  speed: number;
  fairness: number;
  experience: number;
}

/**
 * Per-priority weight profiles. Each profile sums to 1.0 so a total score
 * stays in [0..1] and is directly interpretable as "% of the ideal".
 *
 *  - low / normal: idle + fairness dominate → even rotation (legacy intent).
 *  - high: speed + experience dominate → urgent jobs go to the proven-fast
 *    courier even if they idled less.
 */
export const WEIGHTS_BY_PRIORITY: Record<OrderPriority, FactorWeights> = {
  low: { idle: 0.45, speed: 0.1, fairness: 0.35, experience: 0.1 },
  normal: { idle: 0.4, speed: 0.2, fairness: 0.3, experience: 0.1 },
  high: { idle: 0.15, speed: 0.4, fairness: 0.1, experience: 0.35 },
};

/** Raw per-courier metrics, gathered by AssignmentService from the DB. */
export interface CandidateMetrics {
  courierId: string;
  /** Last time the courier returned to base; null = never (treat as createdAt). */
  lastReturnedAt: Date | null;
  /** Hiring time — idle fallback for never-returned couriers + stable tie-break. */
  createdAt: Date;
  /** Mean (assigned→delivered) duration in seconds; null = no history yet. */
  avgDeliverySeconds: number | null;
  /** Lifetime completed deliveries (experience / reliability proxy). */
  completedDeliveries: number;
  /** Orders taken in the current shift (load balancing). */
  ordersToday: number;
}

export interface FactorScores {
  idle: number;
  speed: number;
  fairness: number;
  experience: number;
}

export interface ScoredCandidate {
  courierId: string;
  /** Weighted total in [0..1]; higher wins. */
  total: number;
  /** Per-factor normalised scores — kept for transparency / logging. */
  factors: FactorScores;
  createdAt: Date;
}

/**
 * Seconds the courier has been free. `lastReturnedAt = null` (never returned)
 * falls back to `createdAt`, matching the legacy NULLS-FIRST semantics where a
 * brand-new courier counts as "at base since hiring".
 */
export function idleSeconds(c: CandidateMetrics, now: Date): number {
  const since = c.lastReturnedAt ?? c.createdAt;
  return Math.max(0, (now.getTime() - since.getTime()) / 1000);
}

/**
 * Min-max normalise a column of factor values into [0..1].
 *
 *  - `higherIsBetter=false` inverts (smaller raw value → higher score), used
 *    for speed (avg duration) and fairness (orders today).
 *  - `null` entries (e.g. a courier with no delivery history) map to
 *    NEUTRAL_SCORE so they neither win nor lose on that factor.
 *  - a degenerate column (all present values equal, or all null) maps every
 *    candidate to NEUTRAL_SCORE — the factor simply can't separate them.
 */
export function normalizeMinMax(
  values: ReadonlyArray<number | null>,
  higherIsBetter: boolean,
): number[] {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) {
    return values.map(() => NEUTRAL_SCORE);
  }
  const min = Math.min(...present);
  const max = Math.max(...present);
  if (max === min) {
    return values.map(() => NEUTRAL_SCORE);
  }
  return values.map((v) => {
    if (v === null) return NEUTRAL_SCORE;
    const t = (v - min) / (max - min);
    return higherIsBetter ? t : 1 - t;
  });
}

/**
 * Rank candidates best-first for an order of the given priority.
 *
 * Returns an empty array for an empty pool. Ties on the weighted total break
 * by `createdAt asc` (the earlier-hired courier wins), preserving the legacy
 * tie-break and keeping the result deterministic.
 */
export function rankCandidates(
  candidates: ReadonlyArray<CandidateMetrics>,
  priority: OrderPriority,
  now: Date,
): ScoredCandidate[] {
  if (candidates.length === 0) return [];
  const weights = WEIGHTS_BY_PRIORITY[priority];

  const idleN = normalizeMinMax(
    candidates.map((c) => idleSeconds(c, now)),
    true,
  );
  const speedN = normalizeMinMax(
    candidates.map((c) => c.avgDeliverySeconds),
    false,
  );
  const fairN = normalizeMinMax(
    candidates.map((c) => c.ordersToday),
    false,
  );
  const expN = normalizeMinMax(
    candidates.map((c) => c.completedDeliveries),
    true,
  );

  const scored: ScoredCandidate[] = candidates.map((c, i) => {
    const factors: FactorScores = {
      idle: idleN[i] ?? NEUTRAL_SCORE,
      speed: speedN[i] ?? NEUTRAL_SCORE,
      fairness: fairN[i] ?? NEUTRAL_SCORE,
      experience: expN[i] ?? NEUTRAL_SCORE,
    };
    const total =
      weights.idle * factors.idle +
      weights.speed * factors.speed +
      weights.fairness * factors.fairness +
      weights.experience * factors.experience;
    return { courierId: c.courierId, total, factors, createdAt: c.createdAt };
  });

  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return scored;
}

/** Convenience: the single best candidate, or null for an empty pool. */
export function pickBestCandidate(
  candidates: ReadonlyArray<CandidateMetrics>,
  priority: OrderPriority,
  now: Date,
): ScoredCandidate | null {
  return rankCandidates(candidates, priority, now)[0] ?? null;
}

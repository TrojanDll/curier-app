import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CourierStatsQueryDto } from './dto/courier-stats-query.dto';
import { CouriersStatsQueryDto } from './dto/couriers-stats-query.dto';
import { OverviewQueryDto } from './dto/overview-query.dto';

// ── Public response shapes ───────────────────────────────────────────────────

export type Bucket = 'hour' | 'day' | 'week';

export interface PeriodWindow {
  /** Inclusive ISO timestamp. */
  from: string;
  /** Inclusive ISO timestamp. */
  to: string;
}

export interface OverviewBucketPoint {
  /** Truncated bucket start as ISO timestamp (e.g. `2026-05-10T00:00:00.000Z`). */
  bucket: string;
  delivered: number;
  returned: number;
}

export interface AvgDeliveryBucketPoint {
  bucket: string;
  /** Average delivery duration in whole minutes, or `null` if no deliveries in this bucket. */
  minutes: number | null;
}

export interface TopCourierEntry {
  courierId: string;
  fullName: string;
  deliveries: number;
}

export interface OverviewResponse {
  period: PeriodWindow;
  bucket: Bucket;
  totalOrders: number;
  delivered: number;
  /** Whole minutes; `null` if there were no completed deliveries in window. */
  avgDeliveryMinutes: number | null;
  /** Decimal serialised as `"123.45"`. `"0.00"` if no revenue. */
  revenue: string;
  ordersPerBucket: OverviewBucketPoint[];
  avgDeliveryTime: AvgDeliveryBucketPoint[];
  topCouriers: TopCourierEntry[];
}

export interface CourierStatsRow {
  id: string;
  fullName: string;
  isPaused: boolean;
  totalOrders: number;
  delivered: number;
  returned: number;
  avgDeliveryMinutes: number | null;
  revenue: string;
}

export interface CouriersStatsResponse {
  period: PeriodWindow;
  couriers: CourierStatsRow[];
}

export interface CourierSelfStatsResponse {
  period: PeriodWindow;
  totalDeliveries: number;
  /** Reached `delivered` or `returned` — full success regardless of return-to-base. */
  successfulDeliveries: number;
  /** Reached `returned` (full cycle complete). */
  returnedOrders: number;
  avgDeliveryTimeMinutes: number | null;
}

// ── Internal types for $queryRaw ─────────────────────────────────────────────

interface AvgRow {
  minutes: number | null;
}

interface RevenueRow {
  /** Postgres SUM(numeric) → Prisma.Decimal. */
  revenue: Prisma.Decimal;
}

interface OrdersBucketRawRow {
  bucket: Date;
  delivered: number;
  returned: number;
}

interface AvgBucketRawRow {
  bucket: Date;
  minutes: number | null;
}

interface TopCourierRawRow {
  courierId: string;
  fullName: string;
  deliveries: number;
}

interface CourierStatsRawRow {
  id: string;
  fullName: string;
  isPaused: boolean;
  totalOrders: number;
  delivered: number;
  returned: number;
  avgDeliveryMinutes: number | null;
  revenue: Prisma.Decimal;
}

interface CourierSelfRawRow {
  totalDeliveries: number;
  successfulDeliveries: number;
  returnedOrders: number;
  avgDeliveryTimeMinutes: number | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_TOP_LIMIT = 5;
const MAX_TOP_LIMIT = 50;
const VALID_BUCKETS: readonly Bucket[] = ['hour', 'day', 'week'];
const BUCKET_INTERVAL: Record<Bucket, string> = {
  hour: '1 hour',
  day: '1 day',
  week: '1 week',
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Admin: overview ─────────────────────────────────────────────────────────

  async getOverview(query: OverviewQueryDto): Promise<OverviewResponse> {
    const { from, to, bucket } = resolveAdminPeriod(
      query.period,
      query.from,
      query.to,
    );
    const topLimit = clampInt(
      query.topLimit,
      1,
      MAX_TOP_LIMIT,
      DEFAULT_TOP_LIMIT,
    );
    const interval = BUCKET_INTERVAL[bucket];

    // ── Scalar KPIs (4 parallel queries) ─────────────────────────────────────
    const [totalOrders, deliveredCount, avgRows, revenueRows] =
      await this.prisma.$transaction([
        this.prisma.order.count({
          where: { createdAt: { gte: from, lte: to } },
        }),
        this.prisma.order.count({
          where: {
            createdAt: { gte: from, lte: to },
            status: OrderStatus.delivered,
          },
        }),
        this.prisma.$queryRaw<AvgRow[]>`
          SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60.0)::float8 AS minutes
          FROM orders
          WHERE created_at >= ${from} AND created_at <= ${to}
            AND delivered_at IS NOT NULL AND assigned_at IS NOT NULL
        `,
        this.prisma.$queryRaw<RevenueRow[]>`
          SELECT COALESCE(SUM(price), 0)::numeric AS revenue
          FROM orders
          WHERE created_at >= ${from} AND created_at <= ${to}
            AND delivered_at IS NOT NULL
        `,
      ]);

    // ── Bucketed series (single roundtrip — covers ordersPerBucket + avgDeliveryTime) ──
    const ordersBucketRows = await this.prisma.$queryRaw<OrdersBucketRawRow[]>`
      WITH series AS (
        SELECT generate_series(
          date_trunc(${bucket}, ${from}::timestamptz),
          date_trunc(${bucket}, ${to}::timestamptz),
          ${interval}::interval
        ) AS bucket
      )
      SELECT s.bucket,
        COALESCE(COUNT(*) FILTER (WHERE o.status = 'delivered'), 0)::int AS delivered,
        COALESCE(COUNT(*) FILTER (WHERE o.status = 'returned'), 0)::int AS returned
      FROM series s
      LEFT JOIN orders o
        ON date_trunc(${bucket}, o.created_at) = s.bucket
       AND o.created_at >= ${from} AND o.created_at <= ${to}
      GROUP BY s.bucket
      ORDER BY s.bucket
    `;

    const avgBucketRows = await this.prisma.$queryRaw<AvgBucketRawRow[]>`
      WITH series AS (
        SELECT generate_series(
          date_trunc(${bucket}, ${from}::timestamptz),
          date_trunc(${bucket}, ${to}::timestamptz),
          ${interval}::interval
        ) AS bucket
      )
      SELECT s.bucket,
        AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.assigned_at)) / 60.0)::float8 AS minutes
      FROM series s
      LEFT JOIN orders o
        ON date_trunc(${bucket}, o.created_at) = s.bucket
       AND o.created_at >= ${from} AND o.created_at <= ${to}
       AND o.delivered_at IS NOT NULL AND o.assigned_at IS NOT NULL
      GROUP BY s.bucket
      ORDER BY s.bucket
    `;

    // ── Top couriers (separate query — needs ORDER BY + LIMIT) ───────────────
    const topRows = await this.prisma.$queryRaw<TopCourierRawRow[]>`
      SELECT c.id AS "courierId",
        c.full_name AS "fullName",
        COUNT(o.id)::int AS deliveries
      FROM couriers c
      JOIN orders o ON o.courier_id = c.id
      WHERE o.status = 'delivered'
        AND o.created_at >= ${from} AND o.created_at <= ${to}
        AND c.is_active = true
      GROUP BY c.id, c.full_name
      ORDER BY deliveries DESC, c.full_name ASC
      LIMIT ${topLimit}
    `;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      bucket,
      totalOrders,
      delivered: deliveredCount,
      avgDeliveryMinutes: roundOrNull(avgRows[0]?.minutes ?? null),
      revenue: decimalToString(revenueRows[0]?.revenue),
      ordersPerBucket: ordersBucketRows.map((r) => ({
        bucket: r.bucket.toISOString(),
        delivered: r.delivered,
        returned: r.returned,
      })),
      avgDeliveryTime: avgBucketRows.map((r) => ({
        bucket: r.bucket.toISOString(),
        minutes: roundOrNull(r.minutes),
      })),
      topCouriers: topRows.map((r) => ({
        courierId: r.courierId,
        fullName: r.fullName,
        deliveries: r.deliveries,
      })),
    };
  }

  // ── Admin: per-courier breakdown ────────────────────────────────────────────

  async getCouriersBreakdown(
    query: CouriersStatsQueryDto,
  ): Promise<CouriersStatsResponse> {
    const { from, to } = resolveAdminPeriod(query.period, query.from, query.to);

    // Single LEFT JOIN aggregate — every active courier appears even with zero
    // orders so the admin table always has a row per courier.
    const rows = await this.prisma.$queryRaw<CourierStatsRawRow[]>`
      SELECT c.id,
        c.full_name AS "fullName",
        c.is_paused AS "isPaused",
        COALESCE(COUNT(o.id), 0)::int AS "totalOrders",
        COALESCE(COUNT(*) FILTER (WHERE o.status = 'delivered'), 0)::int AS delivered,
        COALESCE(COUNT(*) FILTER (WHERE o.status = 'returned'), 0)::int AS returned,
        AVG(EXTRACT(EPOCH FROM (o.delivered_at - o.assigned_at)) / 60.0)
          FILTER (WHERE o.delivered_at IS NOT NULL AND o.assigned_at IS NOT NULL)::float8 AS "avgDeliveryMinutes",
        COALESCE(SUM(o.price) FILTER (WHERE o.delivered_at IS NOT NULL), 0)::numeric AS revenue
      FROM couriers c
      LEFT JOIN orders o
        ON o.courier_id = c.id
       AND o.created_at >= ${from} AND o.created_at <= ${to}
      WHERE c.is_active = true
      GROUP BY c.id, c.full_name, c.is_paused
      ORDER BY delivered DESC, c.full_name ASC
    `;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      couriers: rows.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        isPaused: r.isPaused,
        totalOrders: r.totalOrders,
        delivered: r.delivered,
        returned: r.returned,
        avgDeliveryMinutes: roundOrNull(r.avgDeliveryMinutes),
        revenue: decimalToString(r.revenue),
      })),
    };
  }

  // ── Courier: self stats ─────────────────────────────────────────────────────

  async getCourierSelfStats(
    courierId: string,
    query: CourierStatsQueryDto,
  ): Promise<CourierSelfStatsResponse> {
    const { from, to } = resolveCourierPeriod(
      query.period,
      query.from,
      query.to,
    );

    const rows = await this.prisma.$queryRaw<CourierSelfRawRow[]>`
      SELECT
        COALESCE(COUNT(*), 0)::int AS "totalDeliveries",
        COALESCE(COUNT(*) FILTER (WHERE status IN ('delivered', 'returned')), 0)::int AS "successfulDeliveries",
        COALESCE(COUNT(*) FILTER (WHERE status = 'returned'), 0)::int AS "returnedOrders",
        AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60.0)
          FILTER (WHERE delivered_at IS NOT NULL AND assigned_at IS NOT NULL)::float8 AS "avgDeliveryTimeMinutes"
      FROM orders
      WHERE courier_id = ${courierId}::uuid
        AND created_at >= ${from} AND created_at <= ${to}
    `;

    const row = rows[0];
    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      totalDeliveries: row?.totalDeliveries ?? 0,
      successfulDeliveries: row?.successfulDeliveries ?? 0,
      returnedOrders: row?.returnedOrders ?? 0,
      avgDeliveryTimeMinutes: roundOrNull(row?.avgDeliveryTimeMinutes ?? null),
    };
  }
}

// ── Module-private helpers ───────────────────────────────────────────────────

/**
 * Resolves admin period query into a concrete `{from, to, bucket}` tuple.
 *
 * Priority:
 *   1. Both `from` and `to` valid → use them, auto-pick bucket from span.
 *   2. Only `from` valid → `to = now`, auto bucket.
 *   3. Only `to` valid → `from = to - 30d`, auto bucket.
 *   4. Named `period` (today|week|month) → rolling now-N window with fixed bucket.
 *   5. Default → `week`.
 */
function resolveAdminPeriod(
  periodRaw: string | undefined,
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from: Date; to: Date; bucket: Bucket } {
  const from = parseDateSafe(fromRaw);
  const to = parseDateSafe(toRaw);
  const now = new Date();

  if (from && to) {
    return { from, to, bucket: pickBucketBySpan(from, to) };
  }
  if (from) {
    return { from, to: now, bucket: pickBucketBySpan(from, now) };
  }
  if (to) {
    const f = new Date(to.getTime() - 30 * MS_PER_DAY);
    return { from: f, to, bucket: pickBucketBySpan(f, to) };
  }

  const period = (periodRaw ?? '').toLowerCase();
  switch (period) {
    case 'today':
      return {
        from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        to: now,
        bucket: 'hour',
      };
    case 'month':
      return {
        from: new Date(now.getTime() - 30 * MS_PER_DAY),
        to: now,
        bucket: 'day',
      };
    case 'week':
    default:
      return {
        from: new Date(now.getTime() - 7 * MS_PER_DAY),
        to: now,
        bucket: 'day',
      };
  }
}

/**
 * Courier-side period (no bucket — single aggregate row).
 */
function resolveCourierPeriod(
  periodRaw: string | undefined,
  fromRaw: string | undefined,
  toRaw: string | undefined,
): { from: Date; to: Date } {
  const from = parseDateSafe(fromRaw);
  const to = parseDateSafe(toRaw);
  const now = new Date();

  if (from && to) return { from, to };
  if (from) return { from, to: now };
  if (to) return { from: new Date(to.getTime() - 24 * 60 * 60 * 1000), to };

  const period = (periodRaw ?? '').toLowerCase();
  switch (period) {
    case '7d':
      return { from: new Date(now.getTime() - 7 * MS_PER_DAY), to: now };
    case '30d':
      return { from: new Date(now.getTime() - 30 * MS_PER_DAY), to: now };
    case '24h':
    default:
      return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now };
  }
}

function pickBucketBySpan(from: Date, to: Date): Bucket {
  const days = (to.getTime() - from.getTime()) / MS_PER_DAY;
  if (days <= 2) return 'hour';
  if (days <= 90) return 'day';
  return 'week';
}

function parseDateSafe(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function clampInt(
  raw: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

function roundOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (!Number.isFinite(v)) return null;
  return Math.round(v);
}

function decimalToString(d: Prisma.Decimal | undefined): string {
  if (!d) return '0.00';
  return d.toFixed(2);
}

/** Re-export the bucket whitelist for tests / external validation if needed. */
export const STATISTICS_VALID_BUCKETS = VALID_BUCKETS;

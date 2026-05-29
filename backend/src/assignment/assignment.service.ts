import { Injectable, Logger } from '@nestjs/common';
import { OrderPriority, OrderStatus, Prisma, type Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { COURIER_BUSY_STATUSES } from './eligibility';
import {
  pickBestCandidate,
  type CandidateMetrics,
  type ScoredCandidate,
} from './scoring';

/** Courier columns needed to seed the scorer's per-candidate metrics. */
type CandidateCourier = {
  id: string;
  lastReturnedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Score the eligible pool for an order of the given priority and return the
   * winning courier id, or null if none are free. Optionally excludes one
   * courier id (used by admin "Назначить автоматически" to skip the currently
   * assigned courier when reassigning).
   *
   * Read-only — no advisory lock. If the winner becomes ineligible by the
   * time `reassign` runs, `OrdersService.reassign` surfaces a 409 to the admin.
   * Wrapped in a transaction only so the pool + its metrics come from one
   * consistent snapshot.
   */
  async findBestEligibleForOrder(
    priority: OrderPriority,
    excludeCourierId?: string | null,
  ): Promise<string | null> {
    const where: Prisma.CourierWhereInput = {
      isActive: true,
      isPaused: false,
      orders: { none: { status: { in: [...COURIER_BUSY_STATUSES] } } },
    };
    if (excludeCourierId) {
      where.id = { not: excludeCourierId };
    }
    return this.prisma.$transaction(async (tx) => {
      const couriers = await tx.courier.findMany({
        where,
        select: { id: true, lastReturnedAt: true, createdAt: true },
      });
      const best = await this.selectBest(tx, couriers, priority);
      return best?.courierId ?? null;
    });
  }

  /**
   * Try to assign a freshly created `new` order to the highest-scoring
   * eligible courier for that order's priority. Returns the updated order on
   * success, `null` if no candidate was available (order stays queued) or if
   * the order was no longer `status='new'` by the time the lock was held.
   *
   * Errors are caught + logged: the caller's primary action (the order
   * `create`) has already committed and a failed auto-assign must not roll it
   * back. The order surfaces as `status='new'` and admins can reassign.
   */
  async tryAssignNewOrder(orderId: string): Promise<Order | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialise the whole (read order → score pool → CAS-update) phase
        // across all auto-assign triggers so two concurrent passes can't both
        // land on the same courier. See docs/assignment.md.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curier:assign'))`;

        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order || order.status !== OrderStatus.new) {
          return null;
        }

        const couriers = await tx.courier.findMany({
          where: {
            isActive: true,
            isPaused: false,
            orders: { none: { status: { in: [...COURIER_BUSY_STATUSES] } } },
          },
          select: { id: true, lastReturnedAt: true, createdAt: true },
        });
        const best = await this.selectBest(tx, couriers, order.priority);
        if (!best) {
          return null;
        }
        this.logAssignment(order, best);

        // CAS on the order: only flip if it's still `new`. Defence-in-depth
        // against an admin reassigning between create and here.
        const cas = await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.new },
          data: {
            courierId: best.courierId,
            status: OrderStatus.assigned,
            assignedAt: new Date(),
          },
        });
        if (cas.count !== 1) {
          return null;
        }

        return tx.order.findUnique({ where: { id: orderId } });
      });
    } catch (e) {
      this.logger.error(
        `tryAssignNewOrder(${orderId}) failed`,
        e instanceof Error ? e.stack : String(e),
      );
      return null;
    }
  }

  /**
   * Drain one queued `new` order to the given courier. Triggered when a
   * courier transitions to `returned`, when an admin resumes a paused courier,
   * or (future) when an admin reactivates a disabled courier.
   *
   * Re-verifies eligibility under the lock. The courier is the only candidate
   * here, so there is no scoring — we instead pick the most deserving *order*:
   * highest priority first, oldest within a priority tier (`priority DESC,
   * created_at ASC`). This is the queue-side half of the priority feature.
   */
  async tryAssignToFreeCourier(courierId: string): Promise<Order | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curier:assign'))`;

        // Re-check the courier still qualifies under the lock.
        const courier = await tx.courier.findFirst({
          where: {
            id: courierId,
            isActive: true,
            isPaused: false,
            orders: { none: { status: { in: [...COURIER_BUSY_STATUSES] } } },
          },
        });
        if (!courier) {
          return null;
        }

        // Highest-priority queued order, oldest first within a tier. The
        // (status, priority, created_at) composite index covers this read.
        const next = await tx.order.findFirst({
          where: { status: OrderStatus.new },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        });
        if (!next) {
          return null;
        }

        const cas = await tx.order.updateMany({
          where: { id: next.id, status: OrderStatus.new },
          data: {
            courierId: courier.id,
            status: OrderStatus.assigned,
            assignedAt: new Date(),
          },
        });
        if (cas.count !== 1) {
          return null;
        }

        return tx.order.findUnique({ where: { id: next.id } });
      });
    } catch (e) {
      this.logger.error(
        `tryAssignToFreeCourier(${courierId}) failed`,
        e instanceof Error ? e.stack : String(e),
      );
      return null;
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  /**
   * Gather per-courier metrics for the pool and run the weighted scorer.
   * Returns the best candidate or null for an empty pool.
   */
  private async selectBest(
    tx: Prisma.TransactionClient,
    couriers: CandidateCourier[],
    priority: OrderPriority,
  ): Promise<ScoredCandidate | null> {
    if (couriers.length === 0) {
      return null;
    }
    const now = new Date();
    const metrics = await this.gatherCandidateMetrics(tx, couriers, now);
    return pickBestCandidate(metrics, priority, now);
  }

  /**
   * Build the scorer's input rows. Two reads against the pool:
   *   - delivered-order history (assigned→delivered durations + lifetime
   *     completed count) → speed + experience factors,
   *   - orders taken since 00:00 UTC today → fairness (load-balancing) factor.
   *
   * Averages are computed in code rather than SQL to keep this Prisma-only and
   * the policy (`scoring.ts`) unit-testable in isolation. The pool is bounded
   * by the number of free couriers, so the history scan stays small in
   * practice; if delivery volume grows this is the natural place to add a
   * time window or a denormalised per-courier rollup (see docs/assignment.md).
   */
  private async gatherCandidateMetrics(
    tx: Prisma.TransactionClient,
    couriers: CandidateCourier[],
    now: Date,
  ): Promise<CandidateMetrics[]> {
    const ids = couriers.map((c) => c.id);

    const history = await tx.order.findMany({
      where: {
        courierId: { in: ids },
        deliveredAt: { not: null },
        assignedAt: { not: null },
      },
      select: { courierId: true, assignedAt: true, deliveredAt: true },
    });

    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const todayGroups = await tx.order.groupBy({
      by: ['courierId'],
      where: { courierId: { in: ids }, assignedAt: { gte: startOfDay } },
      _count: { _all: true },
    });

    const durations = new Map<string, { sumSeconds: number; count: number }>();
    for (const o of history) {
      if (!o.courierId || !o.assignedAt || !o.deliveredAt) continue;
      const seconds = (o.deliveredAt.getTime() - o.assignedAt.getTime()) / 1000;
      const acc = durations.get(o.courierId) ?? { sumSeconds: 0, count: 0 };
      acc.sumSeconds += seconds;
      acc.count += 1;
      durations.set(o.courierId, acc);
    }

    const todayCounts = new Map<string, number>();
    for (const g of todayGroups) {
      if (g.courierId) todayCounts.set(g.courierId, g._count._all);
    }

    return couriers.map((c) => {
      const d = durations.get(c.id);
      return {
        courierId: c.id,
        lastReturnedAt: c.lastReturnedAt,
        createdAt: c.createdAt,
        avgDeliverySeconds: d && d.count > 0 ? d.sumSeconds / d.count : null,
        completedDeliveries: d?.count ?? 0,
        ordersToday: todayCounts.get(c.id) ?? 0,
      };
    });
  }

  /** Debug-level trace of why a courier won — the factor breakdown. */
  private logAssignment(order: Order, best: ScoredCandidate): void {
    const f = best.factors;
    this.logger.debug(
      `order ${order.orderNumber} (priority=${order.priority}) → courier ` +
        `${best.courierId} score=${best.total.toFixed(3)} ` +
        `[idle=${f.idle.toFixed(2)} speed=${f.speed.toFixed(2)} ` +
        `fair=${f.fairness.toFixed(2)} exp=${f.experience.toFixed(2)}]`,
    );
  }
}

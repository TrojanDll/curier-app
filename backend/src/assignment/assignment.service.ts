import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, type Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Courier is currently carrying an order — not eligible for auto-assign. */
const COURIER_BUSY_STATUSES: readonly OrderStatus[] = [
  OrderStatus.assigned,
  OrderStatus.picked_up,
  OrderStatus.near_customer,
  OrderStatus.delivered,
];

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Try to assign a freshly created `new` order to the longest-at-base
   * eligible courier. Returns the updated order on success, `null` if no
   * candidate was available (order stays queued) or if the order was no
   * longer in `status='new'` by the time the lock was held.
   *
   * Errors are caught + logged: the caller's primary action (the order
   * `create`) has already committed and a failed auto-assign must not roll
   * it back. The order surfaces as `status='new'` and admins can reassign.
   */
  async tryAssignNewOrder(orderId: string): Promise<Order | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialise the entire (select candidate → CAS-update) phase across
        // all auto-assign triggers so two concurrent passes can't both land
        // on the same courier. See docs/assignment.md.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curier:assign'))`;

        const candidate = await tx.courier.findFirst({
          where: {
            isActive: true,
            isPaused: false,
            orders: {
              none: { status: { in: [...COURIER_BUSY_STATUSES] } },
            },
          },
          orderBy: [
            // NULLS FIRST so brand-new couriers (never returned to base yet)
            // are ranked as "longest at base"; tie-break by createdAt asc so
            // the courier hired first gets the first order.
            { lastReturnedAt: { sort: 'asc', nulls: 'first' } },
            { createdAt: 'asc' },
          ],
        });
        if (!candidate) {
          return null;
        }

        // CAS on the order: only flip if it's still `new`. Defence-in-depth
        // against an admin reassigning between create and here.
        const cas = await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.new },
          data: {
            courierId: candidate.id,
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
   * courier transitions to `returned`, when an admin resumes a paused
   * courier, or (future) when an admin reactivates a disabled courier.
   *
   * Re-verifies eligibility under the lock — the courier might have been
   * paused, disabled, or already given another order in the same instant.
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
            orders: {
              none: { status: { in: [...COURIER_BUSY_STATUSES] } },
            },
          },
        });
        if (!courier) {
          return null;
        }

        // Oldest queued order. The (status, createdAt) composite index from
        // the init migration covers this read.
        const next = await tx.order.findFirst({
          where: { status: OrderStatus.new },
          orderBy: { createdAt: 'asc' },
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
}

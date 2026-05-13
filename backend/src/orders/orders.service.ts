import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { AssignmentService } from '../assignment/assignment.service';
import { PhotosService } from '../photos/photos.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CourierHistoryQueryDto } from './dto/courier-history.query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  toOrderAdminResponse,
  toOrderCourierResponse,
  type OrderAdminResponse,
  type OrderCourierResponse,
} from './order.mappers';
import { buildDateRange } from './order-queries';
import {
  COURIER_ACTIVE_STATUSES,
  COURIER_HISTORY_STATUSES,
  REASSIGNABLE_STATUSES,
  validateCourierTransition,
} from './order-transitions';

// Re-export shapes so existing callers (controllers, StatisticsModule) keep
// importing from `./orders.service` and the mapper move stays internal.
export type { OrderAdminResponse, OrderCourierResponse } from './order.mappers';

export interface PaginatedOrders {
  items: OrderAdminResponse[];
  total: number;
  page: number;
  pageSize: number;
}

// Pure-function constants and helpers live in order-transitions.ts (§14.7.2)
// so unit tests can pin the state machine without a Prisma client.

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignment: AssignmentService,
    private readonly photosService: PhotosService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ── Admin ──────────────────────────────────────────────────────────────────

  async list(query: ListOrdersQueryDto): Promise<PaginatedOrders> {
    // §14.2.14 — ListOrdersQueryDto already enforces sortBy whitelist,
    // order enum, page/pageSize clamping, courierId UUID format, and
    // splits status into a typed OrderStatus[] (or undefined for `all`).
    const { page, pageSize, sortBy, order, status, courierId } = query;
    const search = (query.search ?? '').trim();

    const where: Prisma.OrderWhereInput = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (courierId) {
      where.courierId = courierId;
    }

    const createdAt = buildDateRange(query.from, query.to);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    // List endpoints emit photos: [] to keep the page-of-20 query light;
    // detail endpoints fan out and load metadata via PhotosService.
    return {
      items: items.map((o) => toOrderAdminResponse(o, [])),
      total,
      page,
      pageSize,
    };
  }

  async create(
    adminId: string,
    dto: CreateOrderDto,
  ): Promise<OrderAdminResponse> {
    // If the admin handed the order to a specific courier in the create
    // body, validate eligibility first so we don't insert a row only to
    // fail the assign step. Eligibility rules mirror `reassign`: must
    // exist, be active, and not paused.
    if (dto.courierId) {
      const courier = await this.prisma.courier.findUnique({
        where: { id: dto.courierId },
      });
      if (!courier) {
        throw new NotFoundException('Courier not found');
      }
      if (!courier.isActive || courier.isPaused) {
        throw new ConflictException(
          'Courier is not eligible (inactive or paused)',
        );
      }
    }

    const orderNumber = await this.allocateOrderNumber();
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        deliveryAddress: dto.deliveryAddress,
        productDescription: dto.productDescription,
        comments: dto.comments ?? null,
        price: dto.price ?? null,
        // Manual assignment skips the auto-assign pass; we stamp the
        // courier + assigned status straight away. Eligibility was just
        // verified above so a race is the only failure mode left — and
        // that surfaces as a 409 on subsequent reassign/status calls.
        status: dto.courierId ? OrderStatus.assigned : OrderStatus.new,
        courierId: dto.courierId ?? null,
        assignedAt: dto.courierId ? new Date() : null,
        createdByAdminId: adminId,
      },
    });

    if (dto.courierId) {
      // Manual assignment path — same shape as a successful auto-assign:
      // a brand-new order landing on a courier. Use `orders:new` so the
      // Android client surfaces it via Snackbar instead of treating it
      // as a silent reassign.
      this.realtime.emitOrderAssigned(order);
      return toOrderAdminResponse(order, []);
    }

    // §8 trigger #1: try to hand the new order off immediately. Returns the
    // updated row on success or `null` if no eligible courier was free —
    // either way we surface the latest persisted state to the admin.
    const assigned = await this.assignment.tryAssignNewOrder(order.id);
    const finalOrder = assigned ?? order;
    // Realtime: admin sees `orders:updated` either way; if auto-assign landed
    // the courier sees `orders:new` (their first signal).
    if (assigned) {
      this.realtime.emitOrderAssigned(finalOrder);
    } else {
      this.realtime.emitOrderUpdated(finalOrder);
    }
    // A brand-new order can't have photos yet — skip the lookup.
    return toOrderAdminResponse(finalOrder, []);
  }

  /**
   * Admin "Назначить автоматически" on an existing order. Finds the
   * longest-at-base eligible courier (excluding the one currently assigned,
   * if any) and reassigns the order to them. 409 if no candidate exists.
   *
   * The order must be in a reassignable status (`new` or `assigned`); the
   * underlying `reassign` call enforces this.
   */
  async autoAssign(id: string): Promise<OrderAdminResponse> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!REASSIGNABLE_STATUSES.includes(order.status)) {
      throw new ConflictException(
        'Order can no longer be reassigned (courier already picked it up)',
      );
    }
    const candidate = await this.assignment.findLongestAtBaseEligible(
      order.courierId,
    );
    if (!candidate) {
      throw new ConflictException('No eligible courier available');
    }
    return this.reassign(id, candidate.id);
  }

  async findOneAdmin(id: string): Promise<OrderAdminResponse> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const photos = await this.photosService.listForOrder(id);
    return toOrderAdminResponse(order, photos);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderAdminResponse> {
    const existing = await this.prisma.order.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }
    if (existing.status !== OrderStatus.new) {
      throw new ConflictException(
        'Order can only be edited while it has status "new"',
      );
    }

    const data: Prisma.OrderUpdateInput = {};
    if (dto.customerName !== undefined) data.customerName = dto.customerName;
    if (dto.customerPhone !== undefined) data.customerPhone = dto.customerPhone;
    if (dto.deliveryAddress !== undefined)
      data.deliveryAddress = dto.deliveryAddress;
    if (dto.productDescription !== undefined)
      data.productDescription = dto.productDescription;
    if (dto.comments !== undefined) data.comments = dto.comments;
    if (dto.price !== undefined) data.price = dto.price;

    const updated = await this.prisma.order.update({ where: { id }, data });
    // PATCH is gated on status='new', which means courier_id is null and no
    // photo can have been uploaded — skip the lookup.
    this.realtime.emitOrderUpdated(updated);
    return toOrderAdminResponse(updated, []);
  }

  async reassign(
    id: string,
    newCourierId: string,
  ): Promise<OrderAdminResponse> {
    // courierId UUID format is enforced by ReassignOrderDto (§14.2.14).
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!REASSIGNABLE_STATUSES.includes(order.status)) {
      throw new ConflictException(
        'Order can no longer be reassigned (courier already picked it up)',
      );
    }
    if (order.courierId === newCourierId) {
      throw new BadRequestException(
        'Order is already assigned to this courier',
      );
    }

    const courier = await this.prisma.courier.findUnique({
      where: { id: newCourierId },
    });
    if (!courier) {
      throw new NotFoundException('Courier not found');
    }
    if (!courier.isActive || courier.isPaused) {
      throw new ConflictException(
        'Courier is not eligible (inactive or paused)',
      );
    }

    const previousCourierId = order.courierId;
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        courierId: newCourierId,
        status: OrderStatus.assigned,
        assignedAt: new Date(),
      },
    });
    // Realtime: admin sees `orders:updated`, both prior (if any) and new
    // courier see `orders:reassigned` so the active list updates on both
    // sides.
    this.realtime.emitOrderReassigned(updated, previousCourierId);
    const photos = await this.photosService.listForOrder(id);
    return toOrderAdminResponse(updated, photos);
  }

  // ── Courier ────────────────────────────────────────────────────────────────

  async listActive(courierId: string): Promise<OrderCourierResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        courierId,
        status: { in: [...COURIER_ACTIVE_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => toOrderCourierResponse(o, []));
  }

  async listHistory(
    courierId: string,
    query: CourierHistoryQueryDto,
  ): Promise<OrderCourierResponse[]> {
    const where: Prisma.OrderWhereInput = {
      courierId,
      status: { in: [...COURIER_HISTORY_STATUSES] },
    };
    const createdAt = buildDateRange(query.from, query.to);
    if (createdAt) {
      where.createdAt = createdAt;
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => toOrderCourierResponse(o, []));
  }

  async findOneCourier(
    courierId: string,
    id: string,
  ): Promise<OrderCourierResponse> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    // Hide existence of foreign orders entirely — return 404 instead of 403.
    if (!order || order.courierId !== courierId) {
      throw new NotFoundException('Order not found');
    }
    const photos = await this.photosService.listForOrder(id);
    return toOrderCourierResponse(order, photos);
  }

  async updateStatus(
    courierId: string,
    id: string,
    target: OrderStatus,
  ): Promise<OrderCourierResponse> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order || order.courierId !== courierId) {
      throw new NotFoundException('Order not found');
    }
    const decision = validateCourierTransition(order.status, target);
    if (!decision.ok) {
      // "Missing timestamp mapping" is unreachable for any allowed transition —
      // it only fires if COURIER_NEXT and STATUS_TIMESTAMP_FIELD drift.
      if (decision.reason === 'Missing timestamp mapping') {
        throw new InternalServerErrorException(decision.reason);
      }
      throw new ConflictException(decision.reason);
    }
    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = {
      status: target,
      [decision.timestampField]: now,
    };

    // `returned` also stamps couriers.last_returned_at — drives the
    // auto-assign "longest at base" tie-break.
    if (target === OrderStatus.returned) {
      const [updated] = await this.prisma.$transaction([
        this.prisma.order.update({ where: { id }, data: updateData }),
        this.prisma.courier.update({
          where: { id: courierId },
          data: { lastReturnedAt: now },
        }),
      ]);
      // Admin sees the returning order flip to `returned`.
      this.realtime.emitOrderUpdated(updated);
      // §8 trigger #2: courier just returned → drain one queued order to
      // them. Awaited so the response reflects the freshly assigned order
      // (if any) on the courier's "active" list.
      const drained = await this.assignment.tryAssignToFreeCourier(courierId);
      if (drained) {
        // Admin sees the drained order updated; courier sees `orders:new`.
        this.realtime.emitOrderAssigned(drained);
      }
      const photos = await this.photosService.listForOrder(id);
      return toOrderCourierResponse(updated, photos);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
    });
    this.realtime.emitOrderUpdated(updated);
    const photos = await this.photosService.listForOrder(id);
    return toOrderCourierResponse(updated, photos);
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Allocates the next "ORD-YYYY-NNNN" identifier. The sequence is global
   * (no per-year reset) — keeps the call atomic without a side table or
   * SERIALIZABLE retry. See migration `20260510111910_add_order_number_sequence`.
   *
   * Year is taken from the server clock (UTC). The only race against
   * `created_at` is a midnight-UTC straddle on Dec 31 — acceptable for a
   * display id.
   */
  private async allocateOrderNumber(): Promise<string> {
    const rows = await this.prisma.$queryRaw<Array<{ next: bigint }>>`
      SELECT nextval('order_number_seq') AS next
    `;
    const first = rows[0];
    if (!first) {
      throw new InternalServerErrorException('Failed to allocate order number');
    }
    const year = new Date().getUTCFullYear();
    return `ORD-${year}-${String(first.next).padStart(4, '0')}`;
  }
}

// Date-range helpers moved to ./order-queries.ts for unit-test access.

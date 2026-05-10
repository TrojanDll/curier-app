import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, type Order } from '@prisma/client';
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

// Re-export shapes so existing callers (controllers, StatisticsModule) keep
// importing from `./orders.service` and the mapper move stays internal.
export type { OrderAdminResponse, OrderCourierResponse } from './order.mappers';

export interface PaginatedOrders {
  items: OrderAdminResponse[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Internal constants ───────────────────────────────────────────────────────

const SORTABLE_FIELDS = [
  'createdAt',
  'orderNumber',
  'status',
  'assignedAt',
  'deliveredAt',
] as const;
type SortField = (typeof SORTABLE_FIELDS)[number];

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Active = courier has it but hasn't returned to base yet. */
const COURIER_ACTIVE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.assigned,
  OrderStatus.picked_up,
  OrderStatus.near_customer,
  OrderStatus.delivered,
];

/** History = finished (handed off or back at base). */
const COURIER_HISTORY_STATUSES: readonly OrderStatus[] = [
  OrderStatus.delivered,
  OrderStatus.returned,
];

/** Reassign is only meaningful before the courier has physically picked up. */
const REASSIGNABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.new,
  OrderStatus.assigned,
];

/** Forward-only courier transitions enforced by `updateStatus`. */
const COURIER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.assigned]: OrderStatus.picked_up,
  [OrderStatus.picked_up]: OrderStatus.near_customer,
  [OrderStatus.near_customer]: OrderStatus.delivered,
  [OrderStatus.delivered]: OrderStatus.returned,
};

/** Maps a target status to the audit timestamp column to stamp on transition. */
const STATUS_TIMESTAMP_FIELD: Record<OrderStatus, keyof Order | null> = {
  [OrderStatus.new]: null,
  [OrderStatus.assigned]: 'assignedAt',
  [OrderStatus.picked_up]: 'pickedUpAt',
  [OrderStatus.near_customer]: 'nearCustomerAt',
  [OrderStatus.delivered]: 'deliveredAt',
  [OrderStatus.returned]: 'returnedAt',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const page = clampInt(query.page, 1, Number.MAX_SAFE_INTEGER, 1);
    const pageSize = clampInt(
      query.pageSize,
      1,
      MAX_PAGE_SIZE,
      DEFAULT_PAGE_SIZE,
    );
    const search = (query.search ?? '').trim();
    const sortBy: SortField = (SORTABLE_FIELDS as readonly string[]).includes(
      query.sortBy ?? '',
    )
      ? (query.sortBy as SortField)
      : 'createdAt';
    const order: Prisma.SortOrder = query.order === 'asc' ? 'asc' : 'desc';

    const where: Prisma.OrderWhereInput = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
    }

    const statusList = parseStatusList(query.status);
    if (statusList.length > 0) {
      where.status = { in: statusList };
    }

    if (query.courierId && UUID_RE.test(query.courierId)) {
      where.courierId = query.courierId;
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
        status: OrderStatus.new,
        courierId: null,
        createdByAdminId: adminId,
      },
    });
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
    if (!UUID_RE.test(newCourierId)) {
      throw new BadRequestException('courierId must be a UUID');
    }

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
    const expectedNext = COURIER_NEXT[order.status];
    if (!expectedNext || expectedNext !== target) {
      throw new ConflictException(
        `Cannot transition order from "${order.status}" to "${target}"`,
      );
    }

    const tsField = STATUS_TIMESTAMP_FIELD[target];
    if (!tsField) {
      // `new` has no timestamp and isn't reachable via courier transitions —
      // belt and braces.
      throw new InternalServerErrorException('Missing timestamp mapping');
    }
    const now = new Date();
    const updateData: Prisma.OrderUpdateInput = {
      status: target,
      [tsField]: now,
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

// ── Module-private helpers ───────────────────────────────────────────────────

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

function parseStatusList(raw: string | undefined): OrderStatus[] {
  if (!raw || raw === 'all') return [];
  const allowed = Object.values(OrderStatus) as readonly string[];
  const seen = new Set<OrderStatus>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (allowed.includes(trimmed)) {
      seen.add(trimmed as OrderStatus);
    }
  }
  return [...seen];
}

function parseDateSafe(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function buildDateRange(
  fromRaw: string | undefined,
  toRaw: string | undefined,
): Prisma.DateTimeFilter | undefined {
  const from = parseDateSafe(fromRaw);
  const to = parseDateSafe(toRaw);
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (from) filter.gte = from;
  if (to) filter.lte = to;
  return filter;
}

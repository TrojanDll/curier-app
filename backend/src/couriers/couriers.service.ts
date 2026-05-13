import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserType, type Courier } from '@prisma/client';
import { AssignmentService } from '../assignment/assignment.service';
import { COURIER_BUSY_STATUSES } from '../assignment/eligibility';
import { hashPassword } from '../auth/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateCourierDto } from './dto/create-courier.dto';
import { ListCouriersQueryDto } from './dto/list-couriers.query.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Derived four-state status shown in the admin Couriers table. */
export type CourierCurrentStatus =
  | 'available'
  | 'busy'
  | 'paused'
  | 'fired';

export interface CourierAdminResponse {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  /** ISO date "YYYY-MM-DD" or null. */
  dateOfBirth: string | null;
  isActive: boolean;
  isPaused: boolean;
  /** ISO timestamp; null until the courier returns to base for the first time. */
  lastReturnedAt: string | null;
  /** ISO timestamp; null while the courier is on shift. */
  pausedAt: string | null;
  /** ISO timestamp of the last resume (return to shift after pause). */
  lastResumedAt: string | null;
  /** ISO timestamp; null while the courier is active. */
  firedAt: string | null;
  /** Derived from is_active/is_paused + presence of a busy order. */
  currentStatus: CourierCurrentStatus;
  /**
   * Moment the courier entered `currentStatus`. Always populated — for
   * `available` we fall back to `createdAt` so the counter starts ticking
   * from hire if the courier has never been to base/resumed yet.
   */
  currentStatusSince: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the courier sees in `GET /api/courier/profile` — same as admin minus
 *  the `lastReturnedAt`/`createdAt`/`updatedAt` audit fields. */
export interface CourierSelfResponse {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  isPaused: boolean;
}

export interface PaginatedCouriers {
  items: CourierAdminResponse[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class CouriersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignment: AssignmentService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ── Admin: list / CRUD ─────────────────────────────────────────────────────

  async list(query: ListCouriersQueryDto): Promise<PaginatedCouriers> {
    // §14.2.14 — ListCouriersQueryDto already enforces sortBy whitelist,
    // order/status enums, and clamps page/pageSize via @Min/@Max. The
    // service trusts the DTO and reads typed values directly.
    const { page, pageSize, sortBy, order, status } = query;
    const search = (query.search ?? '').trim();

    const where: Prisma.CourierWhereInput = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }
    switch (status) {
      case 'active':
        where.isActive = true;
        where.isPaused = false;
        break;
      case 'paused':
        where.isActive = true;
        where.isPaused = true;
        break;
      case 'disabled':
        where.isActive = false;
        break;
      case 'all':
        break;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.courier.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // Pull the oldest active order per courier so `currentStatus`
        // can resolve to `busy` (since=assignedAt of that order). One
        // row each — cheap relational fetch, no N+1.
        include: {
          orders: {
            where: { status: { in: [...COURIER_BUSY_STATUSES] } },
            orderBy: { assignedAt: 'asc' },
            take: 1,
            select: { assignedAt: true },
          },
        },
      }),
      this.prisma.courier.count({ where }),
    ]);

    return {
      items: items.map((c) =>
        toAdminResponse(c, c.orders[0]?.assignedAt ?? null),
      ),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateCourierDto): Promise<CourierAdminResponse> {
    // Pre-check unique username for a nicer 409 instead of P2002 leak.
    const existing = await this.prisma.courier.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await hashPassword(dto.password);
    const courier = await this.prisma.courier.create({
      data: {
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      },
    });
    // Fresh courier — can't have any orders yet, so busySince is null.
    return toAdminResponse(courier, null);
  }

  async findOne(id: string): Promise<CourierAdminResponse> {
    const courier = await this.prisma.courier.findUnique({ where: { id } });
    if (!courier) {
      throw new NotFoundException('Courier not found');
    }
    const busySince = await this.fetchBusySince(id);
    return toAdminResponse(courier, busySince);
  }

  async update(
    id: string,
    dto: UpdateCourierDto,
  ): Promise<CourierAdminResponse> {
    if (dto.username !== undefined) {
      const conflict = await this.prisma.courier.findFirst({
        where: { username: dto.username, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException('Username already taken');
      }
    }

    const data: Prisma.CourierUpdateInput = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth =
        dto.dateOfBirth === null ? null : new Date(dto.dateOfBirth);
    }

    return this.runUpdate(id, data);
  }

  async softDelete(id: string): Promise<CourierAdminResponse> {
    const result = await this.runUpdate(id, {
      isActive: false,
      firedAt: new Date(),
    });
    this.realtime.emitCourierStatus(result);
    return result;
  }

  async pause(id: string): Promise<CourierAdminResponse> {
    const result = await this.runUpdate(id, {
      isPaused: true,
      pausedAt: new Date(),
    });
    this.realtime.emitCourierStatus(result);
    return result;
  }

  async resume(id: string): Promise<CourierAdminResponse> {
    // Clear pausedAt so the next pause stamps a fresh "since"; stamp
    // lastResumedAt so the "available since" counter resets to the resume
    // moment instead of an older `lastReturnedAt` from a previous shift.
    const result = await this.runUpdate(id, {
      isPaused: false,
      pausedAt: null,
      lastResumedAt: new Date(),
    });
    this.realtime.emitCourierStatus(result);
    // §8 trigger #3: courier became eligible again → drain one queued order
    // to them. Awaited so the admin's response reflects post-drain state if
    // a follow-up GET inspects the order list immediately.
    const drained = await this.assignment.tryAssignToFreeCourier(id);
    if (drained) {
      // Admin sees the drained order updated; courier sees `orders:new`.
      this.realtime.emitOrderAssigned(drained);
    }
    return result;
  }

  /**
   * Admin types the new password (per §15.4). Also revokes any active refresh
   * tokens of this courier so existing sessions die — otherwise an old device
   * could keep refreshing past the password change.
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    try {
      await this.prisma.$transaction([
        this.prisma.courier.update({
          where: { id },
          data: { passwordHash },
        }),
        this.prisma.refreshToken.updateMany({
          where: { userId: id, userType: UserType.courier, revoked: false },
          data: { revoked: true },
        }),
      ]);
    } catch (e) {
      throw mapNotFound(e);
    }
  }

  // ── Courier self-service ───────────────────────────────────────────────────

  async getProfile(courierId: string): Promise<CourierSelfResponse> {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
    });
    if (!courier) {
      throw new NotFoundException('Courier not found');
    }
    return toSelfResponse(courier);
  }

  async updateProfile(
    courierId: string,
    dto: UpdateProfileDto,
  ): Promise<CourierSelfResponse> {
    const data: Prisma.CourierUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;

    try {
      const courier = await this.prisma.courier.update({
        where: { id: courierId },
        data,
      });
      return toSelfResponse(courier);
    } catch (e) {
      throw mapNotFound(e);
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async runUpdate(
    id: string,
    data: Prisma.CourierUpdateInput,
  ): Promise<CourierAdminResponse> {
    try {
      const courier = await this.prisma.courier.update({
        where: { id },
        data,
      });
      const busySince = await this.fetchBusySince(courier.id);
      return toAdminResponse(courier, busySince);
    } catch (e) {
      throw mapNotFound(e);
    }
  }

  /** Find when this courier's oldest busy order was assigned; null if none. */
  private async fetchBusySince(courierId: string): Promise<Date | null> {
    const row = await this.prisma.order.findFirst({
      where: {
        courierId,
        status: { in: [...COURIER_BUSY_STATUSES] },
      },
      orderBy: { assignedAt: 'asc' },
      select: { assignedAt: true },
    });
    return row?.assignedAt ?? null;
  }
}

// ── Module-private helpers ───────────────────────────────────────────────────

function toAdminResponse(
  c: Courier,
  busySince: Date | null,
): CourierAdminResponse {
  const { currentStatus, currentStatusSince } = deriveCurrentStatus(c, busySince);
  return {
    id: c.id,
    username: c.username,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    dateOfBirth: formatIsoDate(c.dateOfBirth),
    isActive: c.isActive,
    isPaused: c.isPaused,
    lastReturnedAt: c.lastReturnedAt ? c.lastReturnedAt.toISOString() : null,
    pausedAt: c.pausedAt ? c.pausedAt.toISOString() : null,
    lastResumedAt: c.lastResumedAt ? c.lastResumedAt.toISOString() : null,
    firedAt: c.firedAt ? c.firedAt.toISOString() : null,
    currentStatus,
    currentStatusSince: currentStatusSince.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

/**
 * Mirrors the four-state status in the admin Couriers table.
 *
 * Precedence: fired > paused > busy > available. The "since" is the moment
 * the courier entered that state:
 *   - fired   → `firedAt` (falls back to updatedAt if the row pre-dates the
 *               column — backfill in the migration covers most cases).
 *   - paused  → `pausedAt` (same fallback policy).
 *   - busy    → max(`assignedAt` of the oldest busy order, `lastResumedAt`).
 *     Without the `lastResumedAt` clamp, pausing then resuming a courier
 *     who already holds an order would leave the counter on the old
 *     `assignedAt` — but in the UI the courier just changed state twice,
 *     so the counter must restart from the resume moment.
 *   - available → max(createdAt, lastReturnedAt, lastResumedAt). We pick
 *     the **latest** of the three events that could have made the courier
 *     available — hire, return from a delivered order, or resume from
 *     pause. That way an unrelated old timestamp never wins.
 */
function deriveCurrentStatus(
  c: Courier,
  busySince: Date | null,
): { currentStatus: CourierCurrentStatus; currentStatusSince: Date } {
  if (!c.isActive) {
    return { currentStatus: 'fired', currentStatusSince: c.firedAt ?? c.updatedAt };
  }
  if (c.isPaused) {
    return { currentStatus: 'paused', currentStatusSince: c.pausedAt ?? c.updatedAt };
  }
  if (busySince) {
    return {
      currentStatus: 'busy',
      currentStatusSince: latestDate([busySince, c.lastResumedAt]),
    };
  }
  return {
    currentStatus: 'available',
    currentStatusSince: latestDate([c.createdAt, c.lastReturnedAt, c.lastResumedAt]),
  };
}

/** Return the latest non-null Date from the input list. Assumes at least
 *  one non-null entry (e.g. `createdAt`, which is always set). */
function latestDate(dates: ReadonlyArray<Date | null>): Date {
  let max: Date | null = null;
  for (const d of dates) {
    if (!d) continue;
    if (!max || d.getTime() > max.getTime()) max = d;
  }
  // Caller always passes createdAt first, so max is guaranteed non-null.
  return max as Date;
}

function toSelfResponse(c: Courier): CourierSelfResponse {
  return {
    id: c.id,
    username: c.username,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    dateOfBirth: formatIsoDate(c.dateOfBirth),
    isActive: c.isActive,
    isPaused: c.isPaused,
  };
}

function formatIsoDate(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Map Prisma's "record not found" error to a NestJS 404. */
function mapNotFound(e: unknown): unknown {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    return new NotFoundException('Courier not found');
  }
  return e;
}

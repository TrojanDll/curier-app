import { Prisma } from '@prisma/client';

/**
 * Pure helpers for OrdersService query construction (§14.7.2). Date inputs
 * arrive as ISO 8601 strings from class-validator-validated DTOs; we still
 * defensively guard against `Number.isNaN` because production DTOs may
 * evolve to allow loose inputs.
 */

export function parseDateSafe(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildDateRange(
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

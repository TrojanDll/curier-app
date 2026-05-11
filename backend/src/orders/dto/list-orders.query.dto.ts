import { OrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SORTABLE = [
  'createdAt',
  'orderNumber',
  'status',
  'assignedAt',
  'deliveredAt',
] as const;
export type OrdersSortField = (typeof SORTABLE)[number];

/**
 * Parses the `?status=` query into an `OrderStatus[]` filter.
 *
 *   `all` or empty / missing → undefined (no filter)
 *   `assigned,delivered`     → ['assigned', 'delivered']
 *
 * Returning `undefined` from a `@Transform` lets the subsequent
 * `@IsOptional` short-circuit the rest of the chain, so passing
 * `?status=all` does not blow up `@IsEnum`.
 */
function parseStatusList(value: unknown): OrderStatus[] | undefined {
  if (Array.isArray(value)) return value as OrderStatus[];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'all') return undefined;
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as OrderStatus[];
}

/**
 * Query string for `GET /api/admin/orders`. Pagination format from §15.9
 * plus order-specific filters from §5.
 *
 * `@Type(() => Number)` coerces page / pageSize from the express string-only
 * query layer; `@IsEnum(OrderStatus, { each: true })` validates the
 * status array AFTER the @Transform splits it.
 */
export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;

  @IsOptional()
  @IsIn(SORTABLE)
  sortBy: OrdersSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Transform(({ value }) => parseStatusList(value))
  @IsArray()
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];

  @IsOptional()
  @IsUUID()
  courierId?: string;

  @IsOptional()
  @IsISO8601({ strict: false })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: false })
  to?: string;
}

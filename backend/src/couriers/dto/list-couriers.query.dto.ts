import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Whitelist mirrored from CouriersService — never accept arbitrary column
 *  names (no `password_hash` ORDER BY). */
const SORTABLE = [
  'createdAt',
  'fullName',
  'username',
  'lastReturnedAt',
] as const;
export type CouriersSortField = (typeof SORTABLE)[number];

const STATUSES = ['all', 'active', 'paused', 'disabled'] as const;
export type CouriersStatusFilter = (typeof STATUSES)[number];

/**
 * Query string for `GET /api/admin/couriers`. Canonical pagination format
 * from §15.9: `?page=1&pageSize=20&search=&sortBy=&order=asc&status=`.
 *
 * Class-transformer applies `@Type(() => Number)` on `page` / `pageSize`
 * BEFORE class-validator runs, so the service receives a real number and
 * does not need to clampInt anymore. Out-of-range / non-numeric values
 * surface as 400 via the global ValidationPipe.
 */
export class ListCouriersQueryDto {
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
  sortBy: CouriersSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsIn(STATUSES)
  status: CouriersStatusFilter = 'all';
}

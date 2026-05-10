# Statistics — Backend Reference

NestJS `StatisticsModule` (Stage 2.8). Source: `backend/src/statistics/`.

## Endpoints

### Admin (require `@Roles(['admin'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/api/admin/statistics/overview` | 200 | KPI + buckets + top couriers. Query: `period, from, to, topLimit`. |
| GET | `/api/admin/statistics/couriers` | 200 | Per-courier breakdown for the same window. Query: `period, from, to`. |

### Courier (require `@Roles(['courier'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/api/courier/statistics` | 200 | Caller's personal stats. Query: `period, from, to`. Courier id read from JWT. |

## Period resolution

Two ways to specify the window — all endpoints share the same logic, only the named-period vocabulary differs.

| Endpoint | Named periods | Default |
|---|---|---|
| Admin (`overview` / `couriers`) | `today`, `week`, `month` | `week` |
| Courier (`/courier/statistics`) | `24h`, `7d`, `30d` | `24h` |

Resolution order:

1. `from` AND `to` valid ISO timestamps → use them. Auto-pick bucket from span (admin only).
2. Only `from` valid → `to = now`.
3. Only `to` valid → `from = to − 30d` (admin) or `to − 24h` (courier).
4. Otherwise → resolve named `period` to a rolling `now − N` window.

All windows are *rolling* (anchored to `now`), not calendar-aligned.

## Bucket granularity (admin only)

| Span | Bucket |
|---|---|
| ≤ 2 days | `hour` |
| ≤ 90 days | `day` |
| > 90 days | `week` |

For named admin periods: `today → hour`, `week → day`, `month → day`.

Bucket whitelist: `hour | day | week`. The whitelist is enforced server-side before any SQL is composed — `bucket` and the matching `interval` ('1 hour' / '1 day' / '1 week') are constant strings, never user-supplied.

## Metric semantics

All metrics filter by `orders.created_at BETWEEN from AND to`.

| Metric | Definition |
|---|---|
| `totalOrders` | `COUNT(*)` regardless of status. |
| `delivered` (KPI) | `COUNT(*) WHERE status = 'delivered'`. **Excludes** `returned` — once a courier closes the loop the order moves out of "delivered" KPI. |
| `returned` (in `ordersPerBucket`) | `COUNT(*) WHERE status = 'returned'` — i.e. courier returned to base after this delivery. |
| `avgDeliveryMinutes` | `AVG(delivered_at − assigned_at)` in minutes, only over rows with both timestamps present. `null` if no completed deliveries in window. Rounded to a whole minute. |
| `revenue` | `SUM(price) WHERE delivered_at IS NOT NULL`. Only orders that physically reached the customer count. Decimal serialised as `"123.45"`; `"0.00"` if no revenue. |
| `topCouriers[i].deliveries` | per-courier `COUNT(*) WHERE status = 'delivered'`. Active couriers only (`is_active = true`). Sorted DESC, ties broken by `full_name ASC`. `topLimit` clamped to `[1, 50]`, default `5`. |

The KPI/bucket split is intentional: KPI cards show snapshot counts (delivered "right now"), the chart shows per-bucket activity (delivered in this hour/day/week). Frontend can sum bucket `delivered` to cross-check the KPI.

## Bucketed series

Both `ordersPerBucket` and `avgDeliveryTime` come from a `generate_series` LEFT JOIN, so **every bucket in the window is present** even when no orders fall into it:

```
WITH series AS (
  SELECT generate_series(
    date_trunc(<bucket>, <from>),
    date_trunc(<bucket>, <to>),
    '1 <bucket>'::interval
  ) AS bucket
)
SELECT s.bucket, ... FROM series s LEFT JOIN orders o ON ...
```

- Empty buckets → `delivered = 0`, `returned = 0`, `minutes = null`.
- Frontend can render a continuous line/bar chart without gap-filling on its own.
- The series is bounded by `date_trunc` of `from`/`to`, so the first and last buckets may overlap the window edges — orders outside `[from, to]` are still excluded by the JOIN's date filter.

## Response shapes

### `OverviewResponse`
```ts
{
  period: { from: ISOString, to: ISOString },
  bucket: 'hour' | 'day' | 'week',
  totalOrders: number,
  delivered: number,
  avgDeliveryMinutes: number | null,
  revenue: string,                              // "123.45" or "0.00"
  ordersPerBucket: [
    { bucket: ISOString, delivered: number, returned: number },
    ...
  ],
  avgDeliveryTime: [
    { bucket: ISOString, minutes: number | null },
    ...
  ],
  topCouriers: [
    { courierId: string, fullName: string, deliveries: number },
    ...
  ],
}
```

### `CouriersStatsResponse`
```ts
{
  period: { from: ISOString, to: ISOString },
  couriers: [
    {
      id: string,
      fullName: string,
      isPaused: boolean,
      totalOrders: number,
      delivered: number,
      returned: number,
      avgDeliveryMinutes: number | null,
      revenue: string,                          // "123.45" or "0.00"
    },
    ...
  ],
}
```

- Includes every `is_active = true` courier, even with zero orders in the window — frontend gets a stable row-per-courier table.
- Sorted `delivered DESC, fullName ASC`. Frontend can re-sort.

### `CourierSelfStatsResponse`
```ts
{
  period: { from: ISOString, to: ISOString },
  totalDeliveries: number,                      // all orders for this courier in window
  successfulDeliveries: number,                 // status IN (delivered, returned)
  returnedOrders: number,                       // status = returned (full cycle complete)
  avgDeliveryTimeMinutes: number | null,
}
```

The Android client (`StatisticsData` DTO) renames these into snake_case via Moshi.

## DTOs

Plain classes — class-validator wiring is deferred to §14.2.14:

- `OverviewQueryDto` — `period?, from?, to?, topLimit?` as strings.
- `CouriersStatsQueryDto` — `period?, from?, to?`.
- `CourierStatsQueryDto` — `period?, from?, to?` (different vocabulary: `24h | 7d | 30d`).

Service parses + clamps everything (no implicit trust in query strings).

## Behaviour notes

- **Auth**: admin endpoints require `role=admin`, courier endpoint requires `role=courier`. Cross-role calls are rejected with 403 by `RolesGuard`.
- **Courier id always from JWT** (`req.user.sub`) — query/body cannot be used to read another courier's stats.
- **Decimal handling**: `SUM(price)` returns `Prisma.Decimal`; serialised as `.toFixed(2)`. `"0.00"` when no rows match (covered by `COALESCE(..., 0)::numeric`).
- **Timezone**: `created_at` is `timestamptz`. Service casts `from` / `to` to `timestamptz` in raw SQL so PostgreSQL compares apples-to-apples regardless of session TZ.
- **Performance**: bucketed series + top-couriers + scalar KPIs cost 6 queries per overview call. The composite index `(status, created_at)` from the init migration covers the hot path.

## What is NOT here yet

- Realtime updates as orders land — Stage 2.9 (`@nestjs/websockets`).
- class-validator on the query DTOs → Stage 2.14.
- Global exception filter (cleaner Prisma error mapping) → Stage 2.13.
- Custom-period UI on admin → Stage 3 (currently only the named-period buttons are wired in mocks).

The auto-assign + queue drainer (Stage 2.6, see `assignment.md`) and PhotosModule (Stage 2.7, see `photos.md`) are in place — statistics queries stay read-only over the same tables.

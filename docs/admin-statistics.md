# Admin Statistics — API Integration

Stage 14.3.5. Real backend wire-up for the admin Statistics page. Source:
`admin/src/lib/api/statistics.ts`, `admin/src/app/(authenticated)/statistics/StatisticsClient.tsx`.
Backend contract: `docs/statistics.md`.

## Surface

```
admin/src/
├── lib/api/
│   ├── keys.ts                  # + statisticsKeys factory
│   └── statistics.ts            # overview + couriers hooks, DTOs, mappers
└── app/(authenticated)/statistics/
    └── StatisticsClient.tsx     # period switcher + KPI + charts + per-courier table
```

`lib/mock/statistics.ts` deleted — no other screen used it.

## Hooks

| Hook | Endpoint | Returns | Notes |
|---|---|---|---|
| `useStatisticsOverview(query)` | `GET /admin/statistics/overview` | `StatisticsOverview` | KPI + `ordersPerBucket` + `avgDeliveryTime` + `topCouriers`. `placeholderData: (prev) => prev` keeps the previous period rendered during the switch. |
| `useCouriersStats(query)` | `GET /admin/statistics/couriers` | `CouriersStats` | Row-per-active-courier breakdown for the bottom table. Same `placeholderData` strategy. |

Both are read-only — no mutations. Live invalidation (`statisticsKeys.all`)
will be added in Stage 14.3.7 when Socket.IO is wired.

## Query keys

```ts
statisticsKeys.overview({ period, from, to, topLimit })
statisticsKeys.couriers({ period, from, to })
```

Separate keys so flipping the period doesn't wipe the unused endpoint's
cache. `statisticsKeys.all` is the prefix React Query uses for blanket
invalidation later.

## Query mapping (UI → backend)

| UI control | Backend param | Notes |
|---|---|---|
| Period chip "Сегодня" | `period=today` | Backend → rolling `now - 24h`, bucket `hour`. |
| Period chip "Неделя" | `period=week` | Backend → rolling `now - 7d`, bucket `day`. Default if no period. |
| Period chip "Месяц" | `period=month` | Backend → rolling `now - 30d`, bucket `day`. |

`from` / `to` / `topLimit` are exposed in the hook's `OverviewQuery` type
but not yet wired into the UI — a custom-date-range picker is a follow-up.

## DTO ↔ domain mapping

`revenue` arrives as a Decimal string (`"123.45"` / `"0.00"`); the mapper
converts to `number` so `formatCurrency` (Intl.NumberFormat with
`maximumFractionDigits: 0`) handles ₽ rendering. JS-float drift is below
1 ₽ — same trade-off as `mapOrder.price` in `admin-orders.md`.

`bucket` (`hour | day | week`) is forwarded as-is. The UI uses it to pick
the X-axis label formatter (see below). `avgDeliveryMinutes` and bucket
`minutes` are kept as `number | null` — `null` is rendered as "—" in
text and as a Recharts line gap (`connectNulls={false}`).

## Bucket label formatter

`formatBucketLabel(iso, bucket)` in `StatisticsClient.tsx`:

| Bucket | Format | Example |
|---|---|---|
| `hour` | `HH:mm` (ru-RU) | `11:00` |
| `day` | `DD MMM` (ru-RU) | `08 мая` |
| `week` | `нед. DD MMM` | `нед. 05 мая` |

The bucket comes from the backend, not picked client-side, so the
formatter stays in sync with the bucket the data was aggregated by.

## UI structure

1. **Period switcher** — three chips (`today`/`week`/`month`). Click =
   parallel refetch of both hooks; the previous render stays visible
   until new data lands.
2. **KPI cards** — `totalOrders`, `delivered`, `avgDeliveryMinutes`
   (null → "—"), `revenue` (formatCurrency).
3. **Orders per bucket** — `BarChart` with `delivered` (brand) + `returned`
   (brand-soft). X-axis labels come from `formatBucketLabel`.
4. **Average delivery time** — `LineChart` over `avgDeliveryTime`. Gaps
   on `null` minutes (`connectNulls={false}`).
5. **Top couriers** — vertical `BarChart` of `topCouriers`. Empty array
   → "За период никто не закрыл ни одной доставки.".
6. **By-courier breakdown** — six-column table from `useCouriersStats`:
   ФИО (+ "на паузе" hint) · Всего · Доставлено · На базу · Среднее
   время · Выручка. Always one row per `is_active=true` courier, even
   with zero orders — server-side LEFT JOIN.

## State handling

- Initial load (no `overview` yet) → single "Загрузка статистики…" card,
  skips KPI/charts rendering.
- Overview error → red banner above the period chips. The two hooks have
  independent error banners (overview vs couriers) because one can fail
  without invalidating the other's cached data.
- All `isLoading` checks gate on the absence of `data`, not just
  `isLoading` — so a refetch triggered by period switch shows the
  previous data instead of blanking the page.

## What is NOT here yet

- **Custom date range** (`from` / `to` inputs) — UI deferred; the hooks
  already accept them.
- **`topLimit` selector** — same; backend clamps to `[1, 50]`, hook
  forwards untouched.
- **Live updates over Socket.IO** — Stage 14.3.7 will invalidate
  `statisticsKeys.all` on `orders:updated` / `orders:assigned`.
- **Dashboard widgets still on mocks** — `lib/mock/orders.ts` +
  `lib/mock/couriers.ts` remain for the dashboard until that screen
  migrates (no dedicated stage yet — likely after 14.3.7).

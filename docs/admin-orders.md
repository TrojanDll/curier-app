# Admin Orders — API Integration

Stage 14.3.3. Real backend calls for the admin Orders page. Source:
`admin/src/lib/api/{orders,couriers,keys}.ts`, `admin/src/hooks/use-debounce.ts`,
`admin/src/app/(authenticated)/orders/OrdersClient.tsx`. Backend contract:
`docs/orders.md`.

## Surface

```
admin/src/
├── hooks/
│   └── use-debounce.ts        # generic useDebounce(value, ms)
├── lib/api/
│   ├── keys.ts                # orderKeys, courierKeys factories
│   ├── orders.ts              # useOrders, useOrder, useReassignOrder + DTOs/mapper
│   ├── couriers.ts            # useActiveCouriers + DTO/mapper (minimum slice for 3.3)
│   └── index.ts               # re-exports
└── app/(authenticated)/orders/
    └── OrdersClient.tsx       # mock → API
```

## Hooks

| Hook | Endpoint | Returns | Notes |
|---|---|---|---|
| `useOrders(query)` | `GET /admin/orders` | `{ items: Order[], total, page, pageSize }` | Server-side filters + pagination. `placeholderData: (prev) => prev` keeps the previous page visible while the next one loads — no flash of "Загрузка…". |
| `useOrder(id \| null)` | `GET /admin/orders/:id` | `Order` | Disabled while `id === null`. Not used in 3.3 yet — added for future detail navigation. |
| `useReassignOrder()` | `POST /admin/orders/:id/reassign` | `Order` (updated) | On success: `invalidateQueries(orderKeys.lists())` + `setQueryData(orderKeys.detail(id), order)`. |
| `useActiveCouriers()` | `GET /admin/couriers?status=all&pageSize=100&sortBy=fullName` | `Courier[]` | Filters `isActive` client-side; paused couriers are included (admin needs to see them). `staleTime: 60s`. |

## Query keys

```ts
orderKeys.list({ page, pageSize, status, courierId, search, sortBy, order, from, to })
orderKeys.detail(id)
courierKeys.activeOptions()           // single cached slot
```

Hierarchy `[resource, "list" | "detail", ...params]` makes targeted
invalidation cheap — a reassign refreshes only orders, not couriers
or statistics.

## DTO ↔ domain mapping

`OrderAdminDto.price` is `string | null` (Decimal(10,2) on the wire); the
mapper converts to `number | null` because the UI's `formatCurrency`
takes a number and ru-RU `Intl.NumberFormat` rounds anyway. JS-float
drift for shop prices is below the 1 ₽ display precision.

`photos` from the DTO is ignored in 3.3 — Stage 14.3.8 will surface
them in the drawer.

## Filter mapping (UI → backend)

| UI control | Backend param | Notes |
|---|---|---|
| Status chip "Все" | (omitted) | `status` defaults to `all` server-side. |
| Status chip "Активные" | `status=new,assigned,picked_up,near_customer` | Equals `Array.from(ACTIVE_ORDER_STATUSES)`. |
| Status chip "<single>" | `status=<single>` | e.g. `status=delivered`. |
| Search input | `search=<trimmed>` | Debounced 300 ms (`useDebounce`). Empty/whitespace omitted. |
| Courier dropdown | `courierId=<uuid>` | Omitted on "Все курьеры". The mock's "Не назначен" option was dropped because backend has no `courierId IS NULL` filter and the "Новый" status chip serves the same intent (orders are unassigned only while `status='new'`). |
| Page navigation | `page=N` | `pageSize` is fixed at 10 in the UI (`PAGE_SIZE` const). |

Filter / search changes reset `page` to 1 via `useEffect([debouncedSearch, statusFilter, courierFilter])`. A separate `useEffect` clamps `page` to `totalPages` when the result set shrinks (e.g. switching to a narrow filter while on page 3).

## Reassign UX

- Available only while order status ∈ `{ new, assigned }` (matches backend's 409 rule in `docs/orders.md`). Otherwise the drawer shows "Переназначение доступно только для статусов «Новый» и «Назначен»".
- Dropdown lists `isActive && !isPaused` couriers, excluding the current owner (assigning to the same courier is a 400 on the backend — no point offering it).
- `useEffect([order.id])` resets the local `target` state and the mutation when the user opens a different order in the drawer.
- On success: the parent's `setSelectedOrder(updated)` swaps the drawer's order in place, so the badge/courier row flip immediately. The list refetches via `invalidateQueries`.
- On 400/404/409: the backend error envelope is rendered inline under the dropdown via `ApiError.messages().join(". ")`.

## CreateOrderButton

Still disabled (`title="Будет доступно в следующей подзадаче"`). The form will land in a follow-up — backend supports it (`POST /api/admin/orders`, see `docs/orders.md`) but the UI form is out of scope here.

## What is NOT here yet

- **Create / edit order form** — backend ready, UI deferred.
- **Live updates over Socket.IO** — Stage 14.3.7 will subscribe to `orders:updated` / `orders:assigned` and invalidate `orderKeys.lists()` reactively.
- **Photos in the drawer** — Stage 14.3.8.
- **Dashboard widgets still on mocks** — `lib/mock/orders.ts` and `lib/mock/couriers.ts` remain in the repo for the dashboard / statistics / settings screens until their respective stages.
- **Full couriers CRUD hooks** — only `useActiveCouriers` is here. Stage 14.3.4 will add `useCouriers`, `useCreateCourier`, `usePauseCourier`, etc., and at that point reassigning/pausing a courier should also invalidate `courierKeys.activeOptions()`.

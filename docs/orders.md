# Orders — Backend Reference

NestJS `OrdersModule` (Stage 2.5). Source: `backend/src/orders/`.

## Endpoints

### Admin (require `@Roles(['admin'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/api/admin/orders` | 200 | Paginated list. Query: `page, pageSize, search, sortBy, order, status, courierId, from, to`. |
| POST | `/api/admin/orders` | 201 | Body: `CreateOrderDto`. Auto-assign runs synchronously after insert — response may already carry `status='assigned'`, `courierId`, `assignedAt` if a courier was free. See `assignment.md`. |
| GET | `/api/admin/orders/:id` | 200 / 400 / 404 | 400 on malformed UUID (ParseUUIDPipe). |
| PATCH | `/api/admin/orders/:id` | 200 / 400 / 404 / 409 | 409 if `status != 'new'` (only editable while unassigned). |
| POST | `/api/admin/orders/:id/reassign` | 200 / 400 / 404 / 409 | Body `{ courierId }`. See "Reassign rules" below. |
| POST | `/api/admin/orders/:id/cancel` | 200 / 400 / 404 / 409 | Body `{ reason }` (non-empty `CancelOrderDto`). 409 if status ∉ `{new, assigned, picked_up, near_customer}`. See "Cancellation". |

### Courier (require `@Roles(['courier'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/api/courier/orders/active` | 200 | Caller's orders in `{assigned, picked_up, near_customer, delivered}`. No pagination. |
| GET | `/api/courier/orders/history` | 200 | Caller's orders in `{delivered, returned, cancelled}`. Optional `from`/`to` over `createdAt`. |
| GET | `/api/courier/orders/:id` | 200 / 400 / 404 | **404** (not 403) for foreign orders to hide existence. |
| PUT | `/api/courier/orders/:id/status` | 200 / 400 / 404 / 409 | Body `{ status: OrderStatus, cancellationReason? }`. Forward-only transitions; `status: 'cancelled'` is a side-transition needing a non-empty `cancellationReason`. See "Status flow" + "Cancellation". |

Courier id is always read from `req.user.sub` (the JWT) — never URL/body — so a courier can only ever read or modify their own orders. The static segments `/active` and `/history` are declared before `:id` so Nest matches them first.

## Order number

`order_number` is a human-readable id like `ORD-2026-0001`. Generated server-side:

1. `SELECT nextval('order_number_seq')` (PostgreSQL sequence — see migration `20260510111910_add_order_number_sequence`).
2. `ORD-{UTC year}-{padStart(seq, 4, '0')}`.

A single global sequence is atomic and gap-tolerant; we chose it over a per-year reset because the latter needs either a side `order_counters` table or a SERIALIZABLE retry loop. Padding widens automatically past 9999/year.

## List query (`GET /api/admin/orders`)

Format mirrors §15.9 plus the order-specific filters from §5.

| Param | Default | Validation |
|---|---|---|
| `page` | `1` | `@IsInt @Min(1)`; non-numeric → 400. |
| `pageSize` | `20` | `@Min(1) @Max(100)`; out of range → 400. |
| `search` | empty | Case-insensitive `contains` on `orderNumber`, `customerName`, `deliveryAddress`; exact substring on `customerPhone`. |
| `sortBy` | `createdAt` | `@IsIn(['createdAt', 'orderNumber', 'status', 'assignedAt', 'deliveredAt'])` → 400 otherwise. |
| `order` | `desc` | `@IsIn(['asc', 'desc'])` → 400 otherwise. |
| `status` | `all` | `all` / empty → no filter. Otherwise comma-separated `OrderStatus` (e.g. `assigned,delivered`); each token must validate against `@IsEnum(OrderStatus)` or the whole query 400s. |
| `courierId` | none | `@IsUUID` → 400 if malformed. |
| `from` | none | `@IsISO8601` ISO timestamp; `createdAt >= from`. |
| `to` | none | `@IsISO8601` ISO timestamp; `createdAt <= to`. |

Response envelope:
```json
{ "items": [OrderAdminResponse, ...], "total": 42, "page": 1, "pageSize": 20 }
```

## Reassign rules

`POST /api/admin/orders/:id/reassign` body: `{ courierId: string }`.

- 400 if `courierId` is not a UUID (enforced by `ReassignOrderDto.@IsUUID`).
- 404 if the order does not exist.
- 404 if the target courier does not exist.
- 409 if the order's status is not in `{new, assigned}` (courier already physically picked it up — reassignment is moot).
- 409 if the target courier is `is_active=false` or `is_paused=true` — reassign cannot bypass pause/disable.
- 400 if the target courier already owns this order.
- On success the order is moved to `status='assigned'`, `courierId=<new>`, `assignedAt=now()`. `assignedAt` is refreshed even on `assigned → assigned` reassignment so "time-to-pickup" stats stay honest.

## Status flow (courier `PUT /:id/status`)

Forward-only transitions:

```
assigned → picked_up → near_customer → delivered → returned
```

- 404 if the order does not exist or `order.courierId !== req.user.sub` (foreign orders are invisible).
- 409 on any other transition (skip, backward, terminal `returned`).
- The matching audit timestamp is stamped on success: `pickedUpAt`, `nearCustomerAt`, `deliveredAt`, `returnedAt`.
- On `returned` only: in the same `$transaction`, `couriers.last_returned_at = now()`. This drives the "longest at base" auto-assign tie-break. Immediately after the transaction commits, `AssignmentService.tryAssignToFreeCourier` is awaited — see `assignment.md` for trigger semantics.

## Cancellation

`cancelled` is a **terminal side-transition** (not part of `COURIER_NEXT`). Triggered two ways, both routed through the shared `OrdersService.applyCancellation`:

- **Courier** — `PUT /api/courier/orders/:id/status` with `{ status: 'cancelled', cancellationReason }`. Allowed from `COURIER_CANCELLABLE_STATUSES = {assigned, picked_up, near_customer}`. 409 otherwise; 400 if `cancellationReason` is empty.
- **Admin** — `POST /api/admin/orders/:id/cancel` with `{ reason }`. Allowed from `ADMIN_CANCELLABLE_STATUSES = {new, assigned, picked_up, near_customer}` (admin can also drop an unassigned `new` order). 409 otherwise.

On success: `status='cancelled'`, `cancelledAt=now()`, `cancellationReason=<reason>`. If the order had a courier, the same `$transaction` stamps `couriers.last_returned_at=now()` (the courier brings the goods back to base), then `AssignmentService.tryAssignToFreeCourier` drains the next queued order to them — identical to the `returned` path. Realtime: admin gets `orders:updated`, the freed courier gets `orders:cancelled` (see `realtime.md`).

Revenue is unaffected: it counts `delivered_at IS NOT NULL`, which a cancelled order never has (see `statistics.md`).

## Response shapes

### `OrderAdminResponse`
```ts
{
  id, orderNumber,
  customerName, customerPhone, deliveryAddress, productDescription,
  comments: string|null,
  price: string|null,           // "123.45" or null — Decimal serialised as string to avoid float drift
  status: OrderStatus,
  courierId: string|null,
  createdByAdminId: string,
  createdAt: ISOString,
  assignedAt: ISOString|null,
  pickedUpAt: ISOString|null,
  nearCustomerAt: ISOString|null,
  deliveredAt: ISOString|null,
  returnedAt: ISOString|null,
  cancelledAt: ISOString|null,
  cancellationReason: string|null,
  photos: PhotoMeta[],          // [] on list endpoints; populated on detail / transition (see assignment.md, photos.md)
}
```

### `OrderCourierResponse`
Same as admin **minus** `price` and `createdByAdminId` per §15.1 (so it includes `cancelledAt` + `cancellationReason`). `photos: PhotoMeta[]` is included with the same population rule (empty on list, full on detail / transition).

## DTOs

class-validator decorators per `validation.md`:
- `CreateOrderDto` — `customerName, customerPhone, deliveryAddress, productDescription, comments?, price? (IsNumberString)`. `status`, `courierId`, `orderNumber`, `createdByAdminId`, audit timestamps are all server-set.
- `UpdateOrderDto` — every non-system field optional; sending `comments: null` / `price: null` clears, omitting leaves as-is.
- `ReassignOrderDto` — `{ courierId (IsUUID) }`.
- `UpdateStatusDto` — `{ status: OrderStatus (IsEnum), cancellationReason? (IsString, MaxLength 500) }`. Explicit target (not "next") so client and server agree on the intended transition. `cancellationReason` is required by the service only when `status='cancelled'`.
- `CancelOrderDto` — `{ reason (IsString, IsNotEmpty, MaxLength 500) }` for the admin `POST /:id/cancel`.
- `ListOrdersQueryDto` — typed numbers + status array split from comma-separated and validated per element. `CourierHistoryQueryDto` — `from`/`to` IsISO8601, both optional.

## Behaviour notes

- **`price`** is `Decimal(10,2)` in Postgres; serialised as `string` ("123.45") on the wire and accepted as the same. Admin-only field; courier responses strip it (§15.1).
- **PATCH after assignment** is rejected with 409. The order is locked once a courier has it — admins must `reassign` for status/courier changes.
- **Foreign orders → 404** for couriers (not 403) so existence stays hidden. Status updates and detail reads share this rule.
- **`returned` is terminal** for couriers — the next status update returns 409. Reassignment of a returned order also 409s.
- **`from`/`to`** filter `orders.created_at`. History endpoint follows the same convention; "history by deliveredAt" can be added later if needed.
- The composite index `(status, createdAt)` from the init migration covers the hot path "admin list filtered by status + range".

## What is NOT here yet

Auto-assign + queue drainer (Stage 2.6) is in place — see `assignment.md`.
PhotosModule (Stage 2.7), realtime `orders:*` (Stage 2.9), exception filter
(see `exceptions.md`), and class-validator (see `validation.md`) are all
in place.

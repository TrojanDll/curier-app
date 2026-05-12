# Admin Couriers — API Integration

Stage 14.3.4. Real backend wire-up for the admin Couriers page. Source:
`admin/src/lib/api/couriers.ts`, `admin/src/app/(authenticated)/couriers/CouriersClient.tsx`.
Backend contract: `docs/couriers.md`.

## Surface

```
admin/src/
├── lib/api/
│   └── couriers.ts             # CRUD hooks + DTOs + mapper + useActiveCouriers
└── app/(authenticated)/couriers/
    └── CouriersClient.tsx      # toolbar + table + create/edit/reset-password drawer
```

## Hooks

| Hook | Endpoint | Returns | Notes |
|---|---|---|---|
| `useCouriers(query)` | `GET /admin/couriers` | `{ items: Courier[], total, page, pageSize }` | Server-side filters + pagination. `placeholderData: (prev) => prev` keeps prev page during refetch. |
| `useActiveCouriers()` | `GET /admin/couriers?status=all&pageSize=100&sortBy=fullName` | `Courier[]` | Lightweight selector for Orders dropdowns. Filters `isActive` client-side; paused are included. `staleTime: 60s`. All CRUD mutations invalidate this key. |
| `useCreateCourier()` | `POST /admin/couriers` | `Courier` | `onSuccess` → invalidate `courierKeys.lists()` + `activeOptions()`. |
| `useUpdateCourier()` | `PATCH /admin/couriers/:id` | `Courier` | Same invalidations + `setQueryData(detail(id))`. |
| `usePauseCourier()` | `POST /admin/couriers/:id/pause` | `Courier` | Same + `invalidateQueries(orderKeys.lists())` (badge / drawer copy reads `is_paused`). |
| `useResumeCourier()` | `POST /admin/couriers/:id/resume` | `Courier` | Same + `orderKeys.lists()` — backend drains one queued order on resume (`assignment.md`). |
| `useFireCourier()` | `DELETE /admin/couriers/:id` | `Courier` | Soft delete (`is_active=false`). Courier vanishes from `activeOptions`. Orders are not touched. |
| `useResetCourierPassword()` | `POST /admin/couriers/:id/reset-password` | `void` | Backend revokes refresh tokens in the same tx — no cache invalidation needed. |

## Query keys

```ts
courierKeys.list({ page, pageSize, search, sortBy, order, status })
courierKeys.detail(id)
courierKeys.activeOptions()           // shared with Orders dropdowns
```

Reassigning an order does **not** touch `courierKeys` because reassignment
doesn't change a courier's state. Pausing/resuming/firing do touch
`orderKeys.lists()` because they affect derived order columns (courier
name) and auto-assign outcomes.

## Filter mapping (UI → backend)

| UI control | Backend param | Notes |
|---|---|---|
| Status chip "Все" | (omitted) | `status` defaults to `all` server-side. |
| Status chip "На базе" | `status=active` | Backend `active` = `is_active=true AND is_paused=false`. |
| Status chip "На паузе" | `status=paused` | Backend `paused` = `is_active=true AND is_paused=true`. |
| Status chip "Уволенные" | `status=disabled` | Backend `disabled` = `is_active=false`. |
| Search input | `search=<trimmed>` | Debounced 300 ms (`useDebounce`). Empty/whitespace omitted. Backend matches `username, fullName, email` case-insensitive + `phone` exact substring. |
| Page navigation | `page=N` | `pageSize` fixed at 10 in UI (`PAGE_SIZE` const). Sort fixed at `sortBy=fullName, order=asc`. |

Filter / search changes reset `page` to 1; a separate `useEffect` clamps
`page` to `totalPages` when the result set shrinks.

## DTO ↔ domain mapping

`Courier` is a 1-to-1 copy of `CourierAdminDto` — no value transformations
needed (no Decimal, no enum coercion). The mapper exists for symmetry
with `mapOrder` and to keep DTOs as the only place that touches the wire
contract.

## Drawer / forms

The Couriers drawer is reused for three modes via a discriminated union
`DrawerState = null | {mode:"create"} | {mode:"edit",courier} | {mode:"reset-password",courier}`.

### Create form

- Fields: `username (≥3)`, `password (≥6)`, `fullName`, optional `email`, `phone`, `dateOfBirth` (HTML `<input type="date">` produces `YYYY-MM-DD` directly).
- Submit disabled until required fields validate.
- 409 (username conflict) is rendered inline under the form via `ApiError.messages().join(". ")`.

### Edit form

- Pre-populated from `courier`. Each field is sent to the backend **only
  if it differs from the stored value** — undefined skips, empty string
  on nullable fields (`email`, `phone`, `dateOfBirth`) sends `null` to
  clear it (the hint "Пусто — очистит поле" tells the user). This
  preserves PATCH semantics so editing one field doesn't accidentally
  reset another.
- If no field changed, the drawer just closes without firing the PATCH.
- Password is intentionally absent — use the separate "Сбросить пароль"
  flow because the backend revokes refresh tokens there.

### Reset-password form

- Two password fields with mismatch + min-length inline validation.
- On success the courier's active sessions are revoked by the backend.

### Fire (soft-delete)

- Uses native `window.confirm`. On accept → `useFireCourier`. Toast on
  result. The row stays visible under "Все" with the "Уволен" badge and
  is filtered into "Уволенные".

## Status badge — three states only

`computeCourierStatus(courier, orders)` (in `lib/courier-status.ts`)
needs the orders array to differentiate `busy` from `available`. The
Couriers page would have to fetch a wide order slice just to compute
that — wasteful and effectively reimplements StatisticsModule. So this
page uses a local `deriveStatus(courier)` that returns just three values:

| Backend state | Badge label |
|---|---|
| `isActive=false` | "Уволен" |
| `isActive=true && isPaused=true` | "На паузе" |
| `isActive=true && isPaused=false` | "На базе" |

The shared `computeCourierStatus` + the `"busy"` colour stay alive
because the Dashboard widgets (still on mocks) use them; once Stage 14.3.5
lands, the Couriers page can opt back into a richer status via the
StatisticsModule overview endpoint.

## What is NOT here yet

- **Per-courier "active orders" / "deliveries today" columns** — Stage 14.3.5
  via StatisticsModule.
- **Live updates over Socket.IO** — Stage 14.3.7 will subscribe to
  `couriers:status` (and the existing `orders:*`) and invalidate
  `courierKeys.lists()` + `activeOptions()` reactively.
- **Dashboard & Statistics still on mocks** — `lib/mock/couriers.ts`
  remains in the repo for those screens until their respective stages.

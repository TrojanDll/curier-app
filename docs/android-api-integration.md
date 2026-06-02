# Android — API Integration (NestJS contract)

How the courier client maps to the NestJS backend after §7.4. Cross-refs:
`docs/auth.md`, `docs/orders.md`, `docs/couriers.md`, `docs/photos.md`,
`docs/statistics.md`.

## Wire format

- **No envelope.** Every endpoint returns a plain object (or list).
  `{ success, message, data }` is gone — Moshi adapters now decode the
  raw shape directly.
- **camelCase.** Field names match JSON 1:1
  (`accessToken`, `fullName`, `pickedUpAt`, etc) — Moshi default
  reflection produces matching keys, no `@Json(name=…)` needed.
- **String ids.** All ids are UUIDs (`String`) across DTO / domain /
  Room / nav-args.
- **Decimal price** is admin-only and stripped from courier responses
  per §15.1 — `Order` has no `price` field.

## Auth

| Endpoint | Backend → Android |
|---|---|
| `POST /api/auth/courier/login` | `LoginResponse(accessToken, refreshToken, user: CourierProfileDto)` |
| `POST /api/auth/refresh` | `RefreshTokenResponse(accessToken, refreshToken)` |
| `POST /api/auth/logout` | 204, body `{ refreshToken }` |

`LoginResponse` no longer carries `expiresIn`. `JwtUtils.expiresInSeconds`
(`core/util/JwtUtils.kt`) base64-decodes the JWT payload and reads the
`exp` claim. Decode failure → 15-minute fallback (matches `JWT_ACCESS_TTL`
default).

Registration is gone — couriers are created by admins
(`POST /api/admin/couriers`). `RegisterFragment` / `RegisterViewModel` /
`fragment_register.xml` were removed; `loginFragment` no longer points to
`registerFragment` and `action_login_to_register` is dropped from the
nav graph.

## Orders

`OrderDto` mirrors `OrderCourierResponse`:

| Field | Notes |
|---|---|
| `id` | UUID string. |
| `orderNumber` | `ORD-2026-0001`-style human id from the order_number_seq. |
| `customerName/Phone`, `deliveryAddress`, `productDescription?`, `comments?` | As on the wire. |
| `status` | `OrderStatus` enum — includes `NEW` (couriers never see it) and `CANCELLED` (terminal, shown in history). |
| `courierId?` | Always the caller's id; carried so realtime cache merges still work. |
| `createdAt`, `assignedAt?`, `pickedUpAt?`, `nearCustomerAt?`, `deliveredAt?`, `returnedAt?`, `cancelledAt?` | Full timeline; nullable until the transition fires. |
| `cancellationReason?` | Set when `status == CANCELLED`; shown on the details screen and surfaced in history. |
| `photos: List<PhotoMetaDto>` | Embedded on detail / transition responses, empty on lists (see `docs/photos.md`). |

| Endpoint | Method |
|---|---|
| `GET /api/courier/orders/active` | `getActiveOrders()` → `List<OrderDto>` |
| `GET /api/courier/orders/history?from&to` | `getOrderHistory(from, to)` |
| `GET /api/courier/orders/:id` | `getOrderById(id)` |
| `PUT /api/courier/orders/:id/status` | body `{ status, cancellationReason? }` (no client-side timestamp) |

Forward-only transitions remain enforced both client-side
(`OrderStatus.isValidTransition` against the cached row) and server-side
(409 otherwise).

**Cancellation** is a side-transition, exposed via a dedicated repository method
`cancelOrder(orderId, reason)` (not the forward `updateOrderStatus`). It sends
`{ status: "cancelled", cancellationReason }` and is offered from
`assigned/picked_up/near_customer` only. The active-orders Room query excludes
`cancelled`; history includes it (ordered by `COALESCE(returnedAt, cancelledAt)`).

## Profile

`ProfileDto` mirrors `CourierSelfResponse` (adds `isActive`, `isPaused`).
`PUT /api/courier/profile` accepts `{ email?, phone? }` only —
`dateOfBirth` is admin-edited.

### Paused-courier banner (§7.5)

`OrdersViewModel` reads `isPaused` from the profile during `init` and on
every pull-to-refresh, exposing it as
`OrdersUiState.isCurrentCourierPaused`. When `true`, the
`pausedBanner` MaterialCardView at the top of `fragment_orders_list.xml`
becomes visible — auto-assign on the backend is bypassing the courier,
so the UI explains why no new orders show up. Profile-fetch errors are
swallowed; the banner is advisory, not blocking.

## Statistics

`StatisticsDto` mirrors `CourierSelfStatsResponse`:

```kt
StatisticsDto(
    period: StatisticsPeriodDto(from, to),
    totalDeliveries: Int,
    successfulDeliveries: Int,   // delivered + returned (closed cycles)
    returnedOrders: Int,          // returned only
    avgDeliveryTimeMinutes: Int?
)
```

`GET /api/courier/statistics` now accepts `period` (`24h`/`7d`/`30d`,
default `24h`) and/or `from`/`to`. Repository signature is
`getStatistics(period, from, to)`.

## Photos

Upload (`POST /api/courier/orders/:id/photo`) returns a single
`PhotoMetaDto(id, uploadedAt, expiresAt)` — no URL, byte access is gated
by the auth-checked streaming endpoint
`GET /api/courier/orders/:id/photo/:photoId`. The repository now returns
`Photo` (domain), and `OrderDetailsUiState.photoUrl` was renamed to
`lastUploadedPhotoId` to reflect that.

`PhotoFileManager.createPhotoFile(context, orderId: String)` sanitises
the UUID (`[^A-Za-z0-9_-]` → `_`) before composing the local filename.

## Room schema (v5)

Destructive migration is on (`fallbackToDestructiveMigration`), so each bump
simply rebuilds the cache (v4 added `priority`; v5 added `cancelledAt` +
`cancellationReason`):

| Entity | Change |
|---|---|
| `OrderEntity` | `id: String`, `productDescription` nullable, no `statusUpdatedAt`/`completedAt`/`photoUrl`, full timestamp set, nullable `assignedAt`, `courierId?`, `createdAt`. |
| `UserEntity` | `id: String`, gains `isActive`, `isPaused`. |
| `OrderDao` | Active query orders by `createdAt DESC`; history by `returnedAt DESC`. |

Photos are not cached — they live in the detail response only and are
refetched on every `OrderDetails` open.

## Error envelope

The new `errorMessage(code, fallback)` helper in `AuthRepositoryImpl`
maps 401 → "Неверный логин или пароль" and 403 → "Доступ запрещён";
other failures surface as `"<fallback> (HTTP <code>)"`. Repositories for
orders / profile / statistics use the same shape for consistency.

The backend's exception filter (see `docs/exceptions.md`) returns a
typed envelope, but the courier client does not yet parse it — the
status-code fallback is enough for current screens; richer parsing
slots into §7.5+ once realtime errors enter the UI.

## Files touched

| Layer | File |
|---|---|
| Domain | `domain/model/{User,Order,Photo,Statistics}.kt`, `domain/repository/{Auth,Order,Profile}Repository.kt` |
| Data — DTO | `data/remote/dto/{Auth,Order,Profile,Statistics,Photo}Dto.kt` |
| Data — API | `data/remote/api/ApiService.kt` |
| Data — Mapper | `data/mapper/{Auth,Order,Photo,Statistics,User}Mapper.kt` |
| Data — Room | `data/local/entity/{Order,User}Entity.kt`, `data/local/dao/OrderDao.kt`, `data/local/database/AppDatabase.kt` |
| Data — Repository | `data/repository/{Auth,Order,Profile}RepositoryImpl.kt` |
| Core | `core/util/JwtUtils.kt`, `core/util/PhotoFileManager.kt` |
| Presentation | `presentation/ViewModelFactory.kt`, `presentation/orders/*`, `presentation/profile/ProfileViewModel.kt`, `presentation/auth/LoginFragment.kt`, `presentation/photo/PhotoCaptureFragment.kt` |
| Resources | `res/navigation/nav_graph.xml`, `res/layout/fragment_login.xml` |

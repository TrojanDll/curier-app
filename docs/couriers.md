# Couriers — Backend Reference

NestJS `CouriersModule` (Stage 2.4). Source: `backend/src/couriers/`.

## Endpoints

### Admin (require `@Roles(['admin'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/api/admin/couriers` | 200 | Paginated list. Query: `page, pageSize, search, sortBy, order, status`. |
| POST | `/api/admin/couriers` | 201 / 409 | 409 on username conflict. |
| GET | `/api/admin/couriers/:id` | 200 / 400 / 404 | 400 on malformed UUID (ParseUUIDPipe). |
| PATCH | `/api/admin/couriers/:id` | 200 / 400 / 404 / 409 | Partial update; only fields present in body are touched. |
| DELETE | `/api/admin/couriers/:id` | 200 / 400 / 404 | **Soft delete** — sets `is_active=false`, returns the row. |
| POST | `/api/admin/couriers/:id/pause` | 200 / 400 / 404 | Sets `is_paused=true`, returns the row. |
| POST | `/api/admin/couriers/:id/resume` | 200 / 400 / 404 | Sets `is_paused=false`. After the update commits, awaits `AssignmentService.tryAssignToFreeCourier` to drain one queued order to the just-resumed courier — see `assignment.md`. |
| POST | `/api/admin/couriers/:id/reset-password` | 204 / 400 / 404 | Body `{ newPassword }`. Revokes the courier's active refresh tokens in the same tx. |

### Courier (require `@Roles(['courier'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/api/courier/profile` | 200 | Returns `CourierSelfResponse` (no audit fields). |
| PUT | `/api/courier/profile` | 200 | Body: `{ email?, phone? }`. Only those two are editable. |

Courier id is always read from `req.user.sub` (the JWT) — never from URL/body — so a courier cannot read or modify someone else's record.

## List query (`GET /api/admin/couriers`)

Format from §15.9: `?page=1&pageSize=20&search=&sortBy=&order=asc&status=`.

| Param | Default | Validation |
|---|---|---|
| `page` | `1` | `@IsInt @Min(1)`; non-numeric → 400. |
| `pageSize` | `20` | `@Min(1) @Max(100)`; out of range → 400. |
| `search` | empty | Case-insensitive `contains` on `username`, `fullName`, `email`; exact substring on `phone`. |
| `sortBy` | `createdAt` | `@IsIn(['createdAt', 'fullName', 'username', 'lastReturnedAt'])`; anything else → 400. |
| `order` | `desc` | `@IsIn(['asc', 'desc'])` → 400 otherwise. |
| `status` | `all` | `@IsIn(['all', 'active', 'paused', 'disabled'])` — `active` = active && !paused, `paused` = active && paused, `disabled` = `is_active=false`. |

Response envelope:
```json
{ "items": [CourierAdminResponse, ...], "total": 42, "page": 1, "pageSize": 20 }
```

## Response shapes

### `CourierAdminResponse` (admin endpoints)
```ts
{
  id, username, fullName,
  email: string|null, phone: string|null,
  dateOfBirth: "YYYY-MM-DD"|null,    // ISO date string, no time
  isActive: boolean, isPaused: boolean,
  lastReturnedAt: ISOString|null,    // null until the courier first returns to base
  createdAt: ISOString,
  updatedAt: ISOString,
}
```
`passwordHash` is **never** returned.

### `CourierSelfResponse` (courier endpoints)
Same as admin minus `lastReturnedAt`, `createdAt`, `updatedAt`.

## DTOs

class-validator decorators per `validation.md`:
- `CreateCourierDto` — `username, password (≥6), fullName, email? (IsEmail), phone?, dateOfBirth?` (ISO date string).
- `UpdateCourierDto` — every field optional. Sending `email: null` clears it; omitting it leaves it as-is. Same for `dateOfBirth`.
- `ResetPasswordDto` — `{ newPassword (≥6) }`. Admin types it directly per §15.4.
- `UpdateProfileDto` — `{ email?, phone? }` only.
- `ListCouriersQueryDto` — typed numbers (page/pageSize), enum-validated sortBy/order/status; service receives clean values.

## Behaviour notes

- **Soft delete vs hard delete**: `DELETE /:id` is soft only — `is_active=false`, `orders.courier_id` stays for history (orders schema uses `ON DELETE SET NULL` already, but we don't physically delete).
- **`is_paused` does not block login** — paused couriers must still see their pause state. `is_active=false` blocks login (and refresh).
- **`reset-password`** runs `UPDATE couriers + UPDATE refresh_tokens` in a single `$transaction` so the old session can never be used after the new password is set.
- **Username uniqueness** is pre-checked on POST/PATCH for a 409 message; a race that lands on Prisma's P2002 is now translated to 409 by `AllExceptionsFilter` (`exceptions.md`).
- **`dateOfBirth`** is `@db.Date` in Postgres; we serialise as `"YYYY-MM-DD"` and accept the same on input. JS `new Date("YYYY-MM-DD")` parses as UTC midnight, which round-trips correctly through `@db.Date`.

## What is NOT here yet

- Per-courier "active orders" / "deliveries today" stats on the list — that's covered by StatisticsModule, or a future `?include=stats` flag.

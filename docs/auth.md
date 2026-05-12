# Auth — Backend Reference

NestJS `AuthModule` (Stage 2.3). Source: `backend/src/auth/`.

## Endpoints

All routes are mounted under `/api/*` via `app.setGlobalPrefix('api')`.

| Method | Path | Status | Body in | Body out |
|---|---|---|---|---|
| POST | `/api/auth/admin/login` | 200 / 401 | `{ username, password }` | `{ accessToken, refreshToken, user: AdminProfile }` |
| POST | `/api/auth/courier/login` | 200 / 401 | `{ username, password }` | `{ accessToken, refreshToken, user: CourierProfile }` |
| POST | `/api/auth/refresh` | 200 / 401 | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/api/auth/logout` | 204 | `{ refreshToken }` | — |
| POST | `/api/auth/admin/change-password` | 204 / 400 / 401 / 403 / 404 | `{ currentPassword, newPassword }` | — |

`AdminProfile` = `{ id, username, fullName }`. `CourierProfile` adds `email, phone, isActive, isPaused`. Neither shape includes the password hash.

## JWT

- Algorithm: HS256, secret from `JWT_SECRET`.
- Access TTL from `JWT_ACCESS_TTL` (default `15m`), parsed by `auth/ttl.util.ts`.
- Payload: `{ sub: userId, role: 'admin' | 'courier', iat, exp }`.
- Header: `Authorization: Bearer <accessToken>`.

## Refresh tokens

- 32 random bytes via `crypto.randomBytes`, encoded as base64url.
- Stored in `refresh_tokens.token_hash` as SHA-256 hex; plaintext never persisted.
- TTL from `JWT_REFRESH_TTL` (default `30d`).
- **Rotation**: every successful `/refresh` revokes the presented token and issues a new pair.
- **Logout**: revokes by `token_hash`. Idempotent — calling twice still 204.
- Reuse of a revoked or expired token → 401.
- Refresh re-checks the user: admin must still exist; courier must still exist AND `is_active=true`.

## Login rules

- Admin: `bcrypt.compare(password, password_hash)`. On success updates `admins.last_login_at = now()`.
- Courier: same compare, plus `is_active=true` required (`is_paused=true` does NOT block login — paused couriers must still see their state).
- Failure → `401 { message: 'Invalid credentials', error: 'Unauthorized', statusCode: 401 }`.

## Admin change-password (§14.3.6)

`POST /api/auth/admin/change-password` lets an authenticated admin set a
new password without going through a reset link. Guarded by
`@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(['admin'])`.

Body:

```ts
{
  currentPassword: string;   // @MinLength(1) — any non-empty string
  newPassword: string;       // @MinLength(8) @MaxLength(128)
}
```

Flow (`AuthService.changeAdminPassword`):

1. Look up the admin via `@CurrentUser().sub` — 404 if the row was
   deleted between JWT issuance and the request (reads better than 401
   for that edge case).
2. `bcrypt.compare(currentPassword, passwordHash)` — wrong → 401
   `Current password is incorrect`.
3. `bcrypt.hash(newPassword, 10)` and `UPDATE admins SET password_hash`
   in a `prisma.$transaction` that also marks **all** refresh tokens
   for this admin (`user_type='admin'`, `revoked=false`) as revoked.
4. Return 204.

**Session impact**: the current access token stays valid until its TTL
expires (`JWT_ACCESS_TTL`, default 15m), so the caller doesn't get
logged out mid-request. But the refresh token tied to that session is
now revoked, so on the next 401 the BFF's silent refresh fails and the
user lands on `/login`. Other devices / tabs experience the same. This
is intentional — a stolen short-lived access token cannot be escalated
into a permanent takeover.

Length rationale: 8 chars for admins (full panel access) vs 6 for
couriers (`ResetPasswordDto`). 128 cap mirrors bcrypt's effective
72-byte input ceiling with margin.

## Guards & decorators (export from `AuthModule`)

| Symbol | Purpose |
|---|---|
| `JwtAuthGuard` | Extends `AuthGuard('jwt')`. Populates `req.user` from the Bearer token. |
| `RolesGuard` | Reads `@Roles(...)` via `Reflector.createDecorator`. No `@Roles` → open to any authenticated user. |
| `@Roles(['admin'])` / `@Roles(['courier'])` | Whitelist roles for a handler/controller. |
| `@CurrentUser()` | Injects `{ sub, role }` from `req.user`. |

### Usage in feature modules

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['admin'])
@Controller('admin/couriers')
export class AdminCouriersController {
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) { /* ... */ }
}
```

`AuthModule` is imported once in `AppModule`; feature modules just inject the guards (or apply them globally per controller).

## Password helpers (`auth/password.util.ts`)

- `hashPassword(plain)` — bcrypt cost 10. Use in courier creation (Stage 2.4) and admin seed (Stage 2.11).
- `comparePassword(plain, hash)` — used by `AuthService` only.

## What is NOT here yet

First-admin auto-seed from `INITIAL_ADMIN_*` env lives in `SeedModule` —
see [seed.md](seed.md). Validation (`validation.md`) and the global
exception envelope (`exceptions.md`) cover DTO + error contract.

## Side note — WebSocket auth

`AuthModule` re-exports `JwtModule` so the realtime gateway can verify access
tokens during the Socket.IO handshake. See `realtime.md` for room layout and
the `auth.token` channel contract.

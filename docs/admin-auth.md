# Admin Auth — BFF + HttpOnly Cookies

Auth flow for the admin (Stage 3.2). Source: `admin/src/app/api/auth/*`,
`admin/src/app/api/[...path]/route.ts`, `admin/src/lib/server/*`,
`admin/src/lib/auth/use-auth.ts`.

## Architecture

```
Browser ──fetch /api/*──► Next.js BFF route handlers ──fetch──► NestJS backend
            (cookies)            (Bearer header)
```

Browser **never** talks to the backend directly. All requests hit the same
Next origin; HttpOnly cookies travel automatically. The BFF reads the
access token from a cookie, adds `Authorization: Bearer …`, forwards the
request, and on 401 silently exchanges the refresh cookie for a new
token pair before retrying once.

This means `NEXT_PUBLIC_API_URL` is gone. `BACKEND_API_URL` is server-only.

## Cookies

| Name | Set by | Read by | HttpOnly | maxAge |
|---|---|---|---|---|
| `admin-access` | `/api/auth/login`, `/api/[...path]` (after refresh) | `/api/[...path]`, `proxy.ts` (middleware) | yes | 30d |
| `admin-refresh` | same | `/api/auth/logout`, `/api/[...path]` (on 401) | yes | 30d |

- `SameSite=Lax`, `Secure` in production (HTTP in dev, see §15 plan).
- `maxAge` is 30 d for both cookies even though the JWT inside the
  access cookie is only valid 15 min — when backend returns 401 the BFF
  rotates and overwrites both cookies, so cookie longevity ≠ JWT TTL.
- `proxy.ts` (renamed middleware in Next 16) checks **only the presence**
  of `admin-access`. JWT verification is the backend's job at the next
  request. If the access cookie is past its JWT TTL but the refresh
  cookie is still alive, the user lands on a page, the first BFF fetch
  returns 401, BFF rotates, and the user keeps going.

Constants live in `lib/server/auth-cookies.ts`; both `proxy.ts` and the
route handlers import them so the name never drifts.

## Routes

### `POST /api/auth/login` — `app/api/auth/login/route.ts`

Body: `{ username, password }`. Proxies to `POST /api/auth/admin/login`
on backend. On 200: writes both cookies, responds with `{ user }` only.
On 401: returns the backend envelope unchanged so the form shows the
right message.

### `POST /api/auth/logout` — `app/api/auth/logout/route.ts`

Reads the refresh cookie, fires-and-forgets a `POST /api/auth/logout` on
backend (idempotent — backend doesn't care about already-revoked tokens),
then clears both cookies. Returns `204` even if backend was unreachable;
client must end up logged out regardless.

### `* /api/<rest>` — `app/api/[...path]/route.ts`

Catch-all proxy. Algorithm:

1. Missing access cookie → `401` without ever touching backend.
2. Direct hit to `/api/auth/refresh` is blocked (`404`) — refresh is a
   BFF-internal concern, not callable from the browser.
3. Forward the original method/headers/body to
   `${BACKEND_API_URL}/api/<rest><?search>` with `Authorization: Bearer`.
4. On `401` + present refresh cookie → call backend `/auth/refresh`. If
   the rotation succeeds, retry the original request once with the new
   access token, then set both new cookies on the response.
5. If refresh fails (no cookie / 401) → clear both cookies; browser will
   land on `/login` on the next navigation via `proxy.ts`.

Headers passed through to backend: `content-type`, `x-request-id`,
`accept`, `accept-language`. Response headers are forwarded except for
hop-by-hop ones (`transfer-encoding`, `connection`, `keep-alive`,
`content-encoding`, `content-length`).

## Client API

```ts
import { useLogin, useLogout, useUser } from "@/lib/auth/use-auth";
```

- `useUser(): AdminUser | null` — backed by `sessionStorage` so a tab
  refresh shows the username without a spinner. Cached via
  `useSyncExternalStore` — `getSnapshot` returns a stable reference for
  the same raw JSON, otherwise React panics with "Maximum update depth
  exceeded".
- `useLogin()` — `useMutation` against `/api/auth/login`. On success
  writes user to `sessionStorage`, clears the query cache (previous
  account's data must not leak through), and calls `router.refresh()`.
- `useLogout()` — `useMutation` against `/api/auth/logout`. Wipes
  `sessionStorage`, clears the query cache, and replaces history with
  `/login` (so back button does not return to the dashboard).

The realtime gateway (`docs/realtime.md`) will need an access token at
handshake time. Stage 3.7 will add a short-lived ticket endpoint that
returns the current access token to JS — keep this in mind, but it's
not implemented yet.

## What is NOT here yet

- **Socket.IO handshake ticket** — Stage 3.7.
- **Per-feature query hooks** — Stages 3.3–3.6 will add `useOrders`,
  `useCouriers`, etc., calling `apiClient.get('/admin/orders')` which
  goes through the catch-all proxy.
- **Password change endpoint** — backend doesn't expose one yet.
  Settings page (Stage 3.6) will remain a mock until a backend endpoint
  is added.
- **Recovering from a hung backend** — BFF currently waits for fetch to
  finish; we have not added an explicit timeout/AbortSignal. Acceptable
  for LAN deployment per §15 of the completion plan.

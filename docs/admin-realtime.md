# Admin Realtime — Socket.IO Integration

Stage 14.3.7. Live updates for the admin tables via the backend Socket.IO
gateway (`/realtime`). Source:
`admin/src/lib/realtime/RealtimeProvider.tsx`,
`admin/src/app/api/realtime/token/route.ts`,
`admin/src/lib/server/realtime.ts`. Backend contract:
`docs/realtime.md`.

## Surface

```
admin/src/
├── lib/
│   ├── realtime/
│   │   ├── RealtimeProvider.tsx   # client component, opens socket, invalidates cache
│   │   └── index.ts               # barrel
│   └── server/
│       └── realtime.ts            # getRealtimeUrl() — server-only origin resolver
├── app/api/realtime/
│   └── token/route.ts             # BFF GET /api/realtime/token
└── app/(authenticated)/
    └── layout.tsx                 # wraps children in <RealtimeProvider>
```

`socket.io-client` is locked to `4.8.3` to match backend `socket.io`.

## Handshake flow

1. `<RealtimeProvider>` mounts inside the authenticated layout. On a
   non-null `useUser()` it `fetch('/api/realtime/token')`.
2. The BFF reads the HttpOnly access cookie. If absent but the refresh
   cookie is present, it silently rotates the pair (same code path as
   the catch-all proxy) and writes new cookies back on the response.
3. Response payload: `{ token, url }`. `url` is the backend origin —
   server-only (`getRealtimeUrl()`), so the client never inspects env at
   build time.
4. Provider opens `io(`${url}/realtime`, { auth: { token }, transports: ['websocket'] })`.
5. On `connect_error` whose message starts with `Unauthorized`, the
   provider re-fetches the token (BFF may rotate again) and assigns it
   to `socket.auth`; `socket.io-client`'s built-in reconnection loop
   then uses the fresh JWT.

WS does **not** go through the BFF — proxying WebSocket through a Next
route handler is non-trivial, and same-origin is not required for WS
auth (handshake uses the JWT, not cookies). In prod (Stage 5) `wss://`
through a reverse proxy will use the same JWT contract.

## Event → cache map

All updates are **invalidate, not setQueryData**. Payloads match REST
DTO (`docs/realtime.md`), but list shape depends on local filter /
sort / pagination params, so a setQueryData patch would need to
recompute order client-side. A refetch is one network round-trip and
keeps the view perfectly consistent with the filter.

| Event | Queries invalidated |
|---|---|
| `connect` (incl. reconnect) | `orderKeys.all`, `courierKeys.all`, `statisticsKeys.all` |
| `orders:updated` | `orderKeys.lists()`, `orderKeys.detail(payload.id)`, `statisticsKeys.all` |
| `couriers:status` | `courierKeys.lists()`, `courierKeys.activeOptions()`, `courierKeys.detail(payload.id)` |

Note: `orders:new` and `orders:reassigned` go to the courier room, not
to `admin` — the admin learns about reassign via a fresh
`orders:updated` from the same trigger.

`connect` fan-out covers the gap during disconnects (handover between
WS frames, server restart, sleep/wake). The cost is bounded — only
active queries refetch.

## Why not setQueryData

`OrderAdminResponse` (the WS payload for `orders:updated`) is identical
to the REST detail response, **except photos: []**. Setting it on
`orderKeys.detail(id)` would clobber photo metadata cached from a
previous detail fetch. Listing pages need per-filter recompute (search,
status, courier, date range) — non-trivial vs. one refetch.

If this becomes a hot path under load, the migration is:
1. `setQueryData(orderKeys.detail(id), prev => merge prev with payload, photos preserved)`.
2. For lists, keep invalidate (filter-aware).

## Lifecycle

- Mount: `useUser()` non-null → effect runs once → socket opens.
- Logout: `useUser()` flips to `null` → effect cleanup → `socket.disconnect()`.
- Re-login: cleanup ran → next mount opens a fresh socket with the new
  token.
- React StrictMode double-invocation in dev: `cancelled` flag in the
  cleanup short-circuits the first instance; only one socket survives.

## BFF token endpoint

`GET /api/realtime/token` — returns 200 `{ token, url }` or 401.

- Auth source: HttpOnly access cookie. If empty + refresh cookie
  present, rotate via `/auth/refresh` (same helper as the catch-all
  proxy).
- On rotation, the new pair is written back via `setAuthCookies`. The
  client doesn't see this — it just gets a usable token.
- On final 401, the response also `clearAuthCookies` if a refresh
  cookie existed but rotation failed (mirrors the catch-all proxy's
  cleanup on dead refresh).
- Method is `GET` because it's idempotent (single rotation side-effect
  is acceptable for GET — the catch-all does the same).

## Server-only URL

`getRealtimeUrl()` reads `BACKEND_REALTIME_URL` (no `NEXT_PUBLIC_`
prefix). Default: `http://localhost:8081`. The client receives the URL
inside the token payload, so this stays a server-only secret — useful
when the backend is on a private network and only the Next.js BFF can
reach it.

In Stage 5, when docker-compose lands, the env will become
`wss://<host>/realtime` behind Caddy. Same code path.

## What is NOT here yet

- **Toast on incoming events** — not in the plan; the live table is
  the canonical UX. Toasts would compete with the mutation toasts
  already on Couriers / Settings.
- **Connection status indicator** — out of scope. Reconnection is
  silent; users see fresh data either way.
- **Per-order `orders:reassigned` handling on admin** — admin learns
  via `orders:updated`. The dedicated `orders:reassigned` is for the
  affected couriers only (see `docs/realtime.md`).
- **Selective list invalidation** — currently every list-key gets
  invalidated. Filtering by payload status / courierId could prune
  needless refetches. Premature until profiling shows it matters.

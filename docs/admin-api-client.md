# Admin API Client — Reference

Foundation layer for Admin↔Backend integration (Stage 3.1). Source:
`admin/src/lib/api/` and `admin/src/components/providers/QueryProvider.tsx`.

## What is provided

| Symbol | Where | Purpose |
|---|---|---|
| `apiClient` | `lib/api/client.ts` | Singleton axios instance bound to `${NEXT_PUBLIC_API_URL}/api`. |
| `ApiError` / `isApiError` / `toApiError` | `lib/api/errors.ts` | Uniform error type that maps any axios/network failure to the backend envelope from `docs/exceptions.md`. |
| `createQueryClient` | `lib/api/query-client.ts` | Factory for `QueryClient` with admin-wide defaults. |
| `<QueryProvider>` | `components/providers/QueryProvider.tsx` | Client wrapper around `QueryClientProvider` + `ReactQueryDevtools`. Mounted once in root `app/layout.tsx`. |

Public re-exports live in `lib/api/index.ts` — feature code should
import from `@/lib/api`, not from individual files.

## `apiClient`

- baseURL is `${NEXT_PUBLIC_API_URL}/api`. Backend mounts everything
  under `/api` (`app.setGlobalPrefix('api')`), so call sites use
  `apiClient.get("/admin/orders")`, not `/api/admin/orders`.
- `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8081` if unset
  (see `admin/.env.example`).
- A single response interceptor rewrites any rejected response to an
  `ApiError`, so `catch` blocks always have a stable type.
- **Auth wiring is NOT here yet.** The Bearer header and 401→/refresh
  rotation are added in Stage 3.2 by extending the same interceptor stack.

## `ApiError`

| Field | Notes |
|---|---|
| `status` | HTTP status. `0` for network / CORS / abort. |
| `code` | `error` field from the envelope (`Bad Request`, `Unauthorized`, …). Falls back to a status-class label. |
| `requestId` | `x-request-id` header (or `envelope.requestId`). Use it when logging client-side failures so the entry can be cross-referenced with backend Pino logs. |
| `envelope` | The raw `{ statusCode, message, error, requestId, … }` if present. |
| `messages()` | Always returns `string[]`. ValidationPipe returns `message: string[]`; this helper normalises both shapes for UI rendering. |

## `QueryClient` defaults

| Option | Value | Why |
|---|---|---|
| `queries.staleTime` | `30_000` | Tables also receive Socket.IO invalidations (Stage 3.7); aggressive refetch is wasted work. |
| `queries.retry` | `0` for 4xx, `1` otherwise | Don't retry Unauthorized / Validation errors; 5xx may be transient. |
| `queries.refetchOnWindowFocus` | `false` | Realtime updates handle window-focus refresh. Avoids surprising spinners when the user alt-tabs back. |
| `mutations.retry` | `0` | Mutations are typically non-idempotent. Caller decides on retry. |

`QueryClient` is instantiated lazily inside `useState` so StrictMode / HMR
do not recreate it on every render (which would dump the cache).

## Env

`admin/.env.example` ships:

```
NEXT_PUBLIC_API_URL=http://localhost:8081
```

`admin/.gitignore` keeps `.env*` ignored but whitelists `.env.example`.

## What is NOT here yet

- **Bearer + refresh interceptor** — Stage 3.2 (`auth-storage`, login mutation,
  401 retry, route handlers if HttpOnly cookies win the architecture call).
- **Per-feature query hooks / cache keys** — Stage 3.3–3.6 add
  `useOrders`, `useCouriers`, `useStatistics`, `useSettings`.
- **Socket.IO client** — Stage 3.7 invalidates query cache from realtime events.
- **Authenticated photo loader** — Stage 3.8 uses `apiClient.get(url, { responseType: 'blob' })`.

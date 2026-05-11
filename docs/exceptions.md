# Exception Filter — Backend Reference

Global error envelope produced by `AllExceptionsFilter` (Stage 2.13).
Source: `backend/src/common/filters/all-exceptions.filter.ts`. Registered
via `APP_FILTER` in `AppModule.providers`.

## Response shape

Every error response across the API uses the same body:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "requestId": "e0dc9535-8d81-47ae-916d-501c13a815c8",
  "timestamp": "2026-05-11T11:00:25.289Z",
  "path": "/api/admin/orders"
}
```

| Field | Type | Notes |
|---|---|---|
| `statusCode` | number | HTTP status; identical to the response status. |
| `message` | string \| string[] | Human-readable. Arrays come from `class-validator` (§2.14) — preserved so per-field errors survive. |
| `error` | string | Machine-readable HTTP reason phrase (`Bad Request`, `Conflict`, ...). Branch on this in the admin/Android client. |
| `requestId` | string | Mirrors the `x-request-id` response header — grep the backend log by this to find the matching pino HTTP line and any unhandled-exception stack. Omitted if no request id was generated (should not happen — `pinoHttp.genReqId` always sets one). |
| `timestamp` | string | Filter-generated ISO timestamp at envelope construction, **not** request start. |
| `path` | string | `request.url` — includes `/api` prefix and querystring. |

## Exception → status mapping

Order of `instanceof` checks in `classify()`:

| Exception | Status | `error` | Logged? |
|---|---|---|---|
| `HttpException` (incl. `BadRequest`, `Unauthorized`, `NotFound`, `Conflict`, ...) | from `getStatus()` | from response body, fallback to reason phrase | No (already covered by `pinoHttp.customLogLevel`) |
| `MulterError` (`LIMIT_FILE_SIZE`) | 413 | `Payload Too Large` | No |
| `MulterError` (other) | 400 | `Bad Request` | No |
| `Prisma.PrismaClientKnownRequestError` `P2002` | 409 | `Conflict` | No |
| `Prisma.PrismaClientKnownRequestError` `P2025` | 404 | `Not Found` | No |
| `Prisma.PrismaClientKnownRequestError` `P2003` | 409 | `Conflict` | No |
| `Prisma.PrismaClientKnownRequestError` (other) | 500 | `Internal Server Error` | **Yes** (with stack) |
| `Prisma.PrismaClientValidationError` | 400 | `Bad Request` | **Yes** (`Invalid input`, schema not leaked) |
| Anything else | 500 | `Internal Server Error` | **Yes** (with stack) |

For 5xx + Prisma defaults the filter writes one `logger.error({ err, reqId, path }, 'Unhandled exception')` line. 4xx are silent here — `pinoHttp.customLogLevel` already stamps the HTTP request log at `warn`, so logging twice would just double-write the same fact.

## Why `APP_FILTER` instead of `useGlobalFilters`

`{ provide: APP_FILTER, useClass: AllExceptionsFilter }` lets Nest's DI inject the request-scoped `PinoLogger`, which is needed so unhandled stacks share the same `reqId` (set by `pinoHttp.genReqId`) as the HTTP log line. `app.useGlobalFilters(new ...)` in `main.ts` would force a manual `PinoLogger` instantiation and lose context.

## Prisma defaults that fall through

`P2002`, `P2025`, `P2003` are the three Prisma codes we map deliberately because services hit them on normal usage:

- `P2002` — `username` unique-constraint on `couriers`/`admins`.
- `P2025` — `prisma.x.update/delete` against a missing id.
- `P2003` — assigning an order to a deleted courier, or any FK violation.

Services that need a specific user-facing message still throw the HTTP exception themselves (e.g., `CouriersService.create` throws `ConflictException("Username already exists")`); those go through the `HttpException` branch and never reach the Prisma matcher. The Prisma branch is the safety net for code paths that forgot to pre-check.

Any other Prisma code (`P2000`, `P2010`, …) is a bug on our side — 500 + stack log + generic `"Database error"` body.

## What is NOT here yet

- `class-validator` per-field errors — Stage 2.14 wires `ValidationPipe` globally; the filter already handles the `message: string[]` shape Nest produces from it.
- WebSocket error envelope — `RealtimeGateway` (Stage 2.9) uses Socket.IO's own `ack` callback contract; this HTTP filter does not apply to WS frames.
- Sentry / external error tracking — out of v2 scope.

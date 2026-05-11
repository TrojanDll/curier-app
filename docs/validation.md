# Input Validation — Backend Reference

Global `ValidationPipe` + `class-validator` decorators on every DTO
(Stage 2.14). Wired in `backend/src/main.ts`; decorators live in each
module's `dto/` folder.

## Pipe options

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  }),
);
```

| Option | Effect |
|---|---|
| `whitelist: true` | Strip unknown keys out of the inbound object before validation. |
| `forbidNonWhitelisted: true` | …but ALSO 400 if any unknown key was present. First-party callers (admin + Android) — a stray field is a bug worth surfacing. |
| `transform: true` | Run class-transformer first so `@Type` / `@Transform` apply BEFORE validators. Lets DTOs declare real types (`number`, `OrderStatus[]`). |
| `enableImplicitConversion: false` | No silent string→number tricks. Every conversion must be explicit via `@Type` or `@Transform` so the DTO is source-of-truth. |

A failed validation flows through `AllExceptionsFilter` (§14.2.13), so
the error body keeps the standard envelope:

```json
{
  "statusCode": 400,
  "message": ["password must be longer than or equal to 6 characters"],
  "error": "Bad Request",
  "requestId": "…",
  "timestamp": "…",
  "path": "…"
}
```

`message` is the per-field array class-validator produces. The filter
preserves it instead of flattening to a single string so the admin/Android
client can surface field-level errors.

## DTO patterns

### Nullable PATCH-style fields

Optional fields that admin may want to *clear* (e.g. `email: null`) use:

```ts
@IsOptional()
@IsEmail()
email?: string | null;
```

`@IsOptional()` short-circuits validators on both `undefined` AND `null`,
so an explicit `null` skips `@IsEmail()` and reaches the service, which
maps it to a `null` Prisma update (clear the column). Omitting the key
leaves the column as-is.

### Pagination + transform

```ts
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(1)
@Max(100)
pageSize: number = 20;
```

`@Type(() => Number)` coerces the query string `"20"` → number before
`@IsInt()` runs. Defaults are init expressions on the class field —
class-transformer keeps them when the key is absent.

### Comma-separated enums (orders status filter)

`?status=delivered,returned` is split before `@IsEnum(..., { each: true })`:

```ts
@IsOptional()
@Transform(({ value }) => parseStatusList(value))
@IsArray()
@IsEnum(OrderStatus, { each: true })
status?: OrderStatus[];
```

`parseStatusList` returns `undefined` for `all` / empty / missing — and
`@IsOptional()` then short-circuits the rest of the chain, so
`?status=all` does not blow up `@IsEnum`. Garbage tokens (`delivered,xyz`)
still produce a 400 because at least one element fails `@IsEnum`.

### `from` / `to` dates

```ts
@IsOptional()
@IsISO8601({ strict: false })
from?: string;
```

Strings are kept as strings — the StatisticsService and OrdersService
parse them via `new Date()`. ISO8601 with `strict: false` accepts both
date-only (`2026-05-11`) and full timestamps.

### UUID body fields

```ts
@IsUUID()
courierId!: string;
```

Used for `ReassignOrderDto.courierId` and the `?courierId=` filter on
orders list. Failed UUID format → 400 before the service runs, so
service-side regex checks were removed.

## DTO inventory

| Module | Body DTOs | Query DTOs |
|---|---|---|
| auth | `LoginDto`, `RefreshDto` | — |
| couriers | `CreateCourierDto`, `UpdateCourierDto`, `ResetPasswordDto`, `UpdateProfileDto` | `ListCouriersQueryDto` |
| orders | `CreateOrderDto`, `UpdateOrderDto`, `UpdateStatusDto`, `ReassignOrderDto` | `ListOrdersQueryDto`, `CourierHistoryQueryDto` |
| statistics | — | `OverviewQueryDto`, `CouriersStatsQueryDto`, `CourierStatsQueryDto` |

`UpdateStatusDto.status` and the orders list `status` filter both validate
against the Prisma `OrderStatus` enum so a mistyped status never reaches
the forward-transition check.

## Service contract change

DTOs now hand services *typed* values. Helpers removed as a result:

- `CouriersService` — `clampInt`, `sortBy` / `status` whitelisting in code.
- `OrdersService` — `clampInt`, `parseStatusList`, `UUID_RE` test for
  query/body courierId.
- `StatisticsService` — `clampInt` for `topLimit`.

Services keep `parseDateSafe` for `from` / `to` since the DTO leaves them
as ISO strings.

## What is NOT here yet

- Header-level validation (`x-request-id` UUID enforcement etc.) — explicitly
  out of scope; pinoHttp accepts any non-blank string. See `observability.md`.
- Multipart-body field validation (file MIME via decorator) — Multer + manual
  checks in `PhotosService.uploadForCourier` still do MIME/size enforcement.
  class-validator does not handle file fields cleanly without a custom decorator;
  out of v2 scope.
- Per-field i18n on validation messages — out of scope; admin UI translates
  by `error` + `path` if needed.

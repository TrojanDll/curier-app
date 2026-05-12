# Settings — Backend Reference

NestJS `SettingsModule` (Stage 2.15, admin endpoints added during
§14.3.6; courier read added in §7.8). Source: `backend/src/settings/`.
Runtime-editable app-wide tunables. Currently two fields:
`photoTtlDays` and `supportContact`.

## Endpoints

Admin routes (`@UseGuards(JwtAuthGuard, RolesGuard)`,
`@Roles(['admin'])`); courier read uses the same guards with
`@Roles(['courier'])`. All mounted under `/api/*` via
`app.setGlobalPrefix('api')`.

| Method | Path | Roles | Status | Body in | Body out |
|---|---|---|---|---|---|
| GET | `/api/admin/settings` | admin | 200 / 401 / 403 | — | `AppSettingsView` |
| PATCH | `/api/admin/settings` | admin | 200 / 400 / 401 / 403 | `UpdateSettingsDto` | `AppSettingsView` (after update) |
| GET | `/api/courier/settings` | courier | 200 / 401 / 403 | — | `PublicAppSettingsView` |

### `AppSettingsView`

```ts
{
  photoTtlDays: number;            // 1..365 (DB CHECK is service-level, not column-level)
  supportContact: string | null;   // ≤500 chars; NULL = "not configured"
  updatedAt: ISOString;
}
```

### `PublicAppSettingsView`

Strict subset of `AppSettingsView` exposed to couriers — drops
`updatedAt` and any future admin-internal fields (e.g. audit columns).
Drives the Android Profile info card (§7.8).

```ts
{
  photoTtlDays: number;
  supportContact: string | null;
}
```

### `UpdateSettingsDto`

```ts
{
  photoTtlDays?: number;             // @IsInt @Min(1) @Max(365)
  supportContact?: string | null;    // @IsString @MaxLength(500); null clears
}
```

All fields optional — only the columns present in the body are updated.
Sending an empty `{}` is allowed and a no-op (`updatedAt` still advances
via Prisma's `@updatedAt`). `supportContact: null` (or a whitespace-only
string, which the service normalises to NULL) clears the field — mirrors
the `UpdateCourierDto.email` clear-PATCH convention.

## Storage model

```prisma
model AppSettings {
  id             Int      @id @default(1)
  photoTtlDays   Int      @default(30) @map("photo_ttl_days")
  supportContact String?  @map("support_contact")   // §7.8 — free-form text
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("app_settings")
}
```

Singleton row keyed by `id=1`. There is exactly one settings row per
deployment — `SettingsService` guarantees existence via an upsert at
bootstrap, so consumers never need to handle a missing row.

**Adding a new tunable**: add a column to `AppSettings` + a matching
optional field on `UpdateSettingsDto`. The controller is generic — no
change required.

## Bootstrap behaviour

`SettingsService.onApplicationBootstrap` runs once per process:

| Existing row? | Action |
|---|---|
| Yes | Skip (`debug` log with current value). |
| No, `PHOTO_TTL_DAYS` env set and in `[1, 365]` | Create row with `photoTtlDays = env value`. |
| No, env missing or out-of-range | Create row with `photoTtlDays = 30` (default). |

After the first boot the env value is **never** consulted again — admin
edits via PATCH are the source of truth. Changing `PHOTO_TTL_DAYS` on a
deployed instance has no effect; use the admin UI or PATCH directly.

## Support contact semantics

Added in §7.8 so the Android Profile screen can show the dispatcher's
name + phone / email / Telegram alongside the photo TTL hint.

- Free-form text, ≤500 chars. The service trims and converts
  whitespace-only input to NULL on PATCH so the courier UI never
  renders an empty string (it falls back to a generic "обратитесь к
  администратору" hint instead).
- Read by `PublicAppSettingsView` for couriers and by `AppSettingsView`
  for admins. There is no separate cron / runtime consumer — purely
  informational.
- Android renders the value with `android:autoLink="phone|email|web"`,
  so admins typing real phone numbers / URLs get tappable links for
  free.

## Photo TTL semantics

`PhotosService.uploadForCourier` reads `photoTtlDays` from this service
on every upload (`SettingsService.getPhotoTtlDays`). Implications:

- **New uploads pick up the new TTL immediately** — no restart required.
- **Existing rows are not retroactively re-stamped.** `expires_at` is
  written at upload time; the cleanup cron (Stage 2.10) deletes by
  `expires_at < now`, so a photo uploaded under 30-day TTL still
  expires at +30 days even if the admin later lowers TTL to 7.
- Trade-off rationale: retroactively shortening TTL would erase photos
  the admin had committed to keeping, which is destructive and would
  surprise courriers viewing history. The current rule is conservative
  and easy to reason about.

## Behaviour notes

- The GET handler returns a fresh row read from the DB on every call —
  there is no in-memory cache. The hot path is one primary-key lookup,
  which Postgres serves in microseconds.
- PATCH is a partial update — fields not in the body are left untouched,
  but `updatedAt` is always bumped (Prisma `@updatedAt`).
- `ensureRow()` re-runs the upsert defensively in case a service consumer
  instantiates the class without `onApplicationBootstrap` (tests,
  standalone Nest contexts).

## What is NOT here yet

- **History / audit trail** of who changed what when — out of scope; the
  `updatedAt` timestamp is the only audit field.
- **Multiple-instance coordination** — Stage 5 may introduce horizontal
  scaling. The current service is fine for a single-process backend
  (which §16 mandates), but a future multi-pod deployment would need a
  cache-invalidation channel for `getPhotoTtlDays` to avoid pinging the
  DB on every photo upload.
- **Other tunables** (max photo size, default page size, etc.) — adding
  them is mechanical (column + DTO field).

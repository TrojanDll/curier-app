# Photos — Backend Reference

NestJS `PhotosModule` (Stage 2.7). Source: `backend/src/photos/`.

## Endpoints

### Courier (require `@Roles(['courier'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| POST | `/api/courier/orders/:id/photo` | 201 / 400 / 404 | Multipart, field name `photo`. Owner check: order must belong to caller — else 404. |
| GET | `/api/courier/orders/:id/photo/:photoId` | 200 / 400 / 404 | Stream the bytes. Owner check applies; foreign photo → 404. |

### Admin (require `@Roles(['admin'])`)

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/api/admin/orders/:id/photo/:photoId` | 200 / 400 / 404 | Stream the bytes. No ownership constraint — admins see all. |

`:id` and `:photoId` go through `ParseUUIDPipe`. The courier id always comes from the JWT (`req.user.sub`); URL/body inputs cannot be used to address foreign data.

## Upload constraints

| Constraint | Value | Source |
|---|---|---|
| MIME | `image/jpeg`, `image/png` only | Hardcoded in `PhotosService.uploadForCourier`. heic/webp deliberately excluded. |
| Size | `PHOTO_MAX_SIZE_MB` (default 10) | Env-driven, evaluated at module init. Validated in service against `buffer.byteLength`. |
| Anti-DoS cap | 50 MB | Hardcoded multer `limits.fileSize` in the controller — covers payloads above the env limit so the request body is bounded even if env is misconfigured. |
| Empty | rejected | Zero-byte buffer → 400 (`Photo file is empty`). |

A request larger than the multer cap is aborted by multer mid-stream and surfaces as a 500 today; the global exception filter (Stage 2.13) will translate the `MulterError` into a clean 413.

## Storage layout

```
<PHOTO_UPLOAD_DIR>/<orderId>/<photoId>.<ext>
```

- `PHOTO_UPLOAD_DIR` defaults to `./uploads` (relative to the backend cwd; resolved to absolute at module init).
- `<ext>` is `jpg` or `png`, derived from the request MIME — there is no client-supplied filename or path.
- `filePath` in the DB is **relative** (`<orderId>/<photoId>.<ext>`); the absolute path is composed at read time via `path.join(uploadDir, filePath)`. No client input touches the filesystem path → no traversal.

`/uploads` is in `.gitignore`. Docker volume mounting is Stage 5.

## Atomicity (DB row vs file on disk)

The path of an upload, top to bottom:

1. Validate MIME + size + non-empty.
2. Lookup order; 404 if missing or foreign.
3. **Insert** `OrderPhoto` row with placeholder `filePath=''` to claim an id + `expiresAt`.
4. `mkdir -p <uploadDir>/<orderId>` and `writeFile(absPath, buffer)`.
5. On success, **update** the row: `filePath = '<orderId>/<id>.<ext>'`. Return meta.
6. On disk-write failure: `delete` the row, best-effort `unlink` of any partial bytes, throw 500.

Rationale:

- DB-first claims the id deterministically — no `crypto.randomUUID` collision worries on disk before insert.
- Two-phase update lets the row exist without a file path while we're writing; reads only ever see rows with non-empty `filePath` because between insert and update no GET handler can have observed the row (the id is brand-new, not in any list yet).
- The fail-path leaves no orphan rows. An orphan **file** (row deleted but unlink failed) is possible only on cascading filesystem errors; the cleanup cron is the eventual sweeper.

## TTL

- `expires_at = uploaded_at + PHOTO_TTL_DAYS * 24h` (default 30 days).
- TTL is **stored at upload time**, not derived dynamically. Changing `PHOTO_TTL_DAYS` later does not retroactively shift existing rows.
- Expired rows + files are removed by the hourly cleanup cron — see **Cleanup cron** below.

## Cleanup cron

`PhotosCleanupService` (Stage 2.10). Source: `backend/src/photos/photos-cleanup.service.ts`.

| Aspect | Value |
|---|---|
| Schedule | `CronExpression.EVERY_HOUR` (`'0 * * * *'`), wired via `ScheduleModule.forRoot()` in `AppModule`. |
| Concurrency | Process-local `isRunning` flag — overlapping ticks log a warning and skip. Single instance per §16, so no advisory lock. |
| Batch limit | 1000 expired rows per tick (`BATCH_LIMIT`). Anything above gets picked up on the next tick. |
| Order | `unlink` first, then `deleteMany` rows for the ones that succeeded. `ENOENT` on disk is treated the same as success (orphan row from a half-finished upload). |
| Error policy | A non-`ENOENT` unlink keeps the row so a future tick retries — better an orphan row than a row pointing at a file that still exists. |
| Empty dirs | After deletion, every order directory that is now empty is `rmdir`-ed. Failures are logged at `warn` and ignored. |

`cleanup()` is exposed publicly so e2e harnesses (and an eventual admin "force
cleanup" button) can invoke it via `NestFactory.createApplicationContext` +
`app.get(PhotosCleanupService).cleanup()`. Returns:

```ts
{
  scanned: number;          // rows matching expiresAt < now (capped at BATCH_LIMIT)
  rowsDeleted: number;      // actually removed from the table
  filesUnlinked: number;    // files that existed and were removed
  unlinkErrors: number;     // non-ENOENT failures (rows kept for retry)
  emptyDirsRemoved: number;
  durationMs: number;
}
```

The cron does **not** scan the filesystem for orphan files (rows missing,
files present). That's a different fail mode and is out of scope here.

## Response shapes

### `PhotoMeta`
```ts
{
  id: string;             // UUID
  uploadedAt: ISOString;
  expiresAt: ISOString;
}
```

`POST /api/courier/orders/:id/photo` returns a single `PhotoMeta` with status 201.

### Embedded into order detail
`OrderAdminResponse` and `OrderCourierResponse` carry `photos: PhotoMeta[]` populated on **detail** and **transition** endpoints:

| Endpoint | `photos` content |
|---|---|
| `POST /api/admin/orders` | `[]` (always — brand-new order) |
| `GET /api/admin/orders/:id` | actual list, oldest first |
| `PATCH /api/admin/orders/:id` | `[]` (PATCH gated on `status='new'`, so no photos exist) |
| `POST /api/admin/orders/:id/reassign` | actual list (photos may carry over from a prior assignment) |
| `GET /api/admin/orders` (list) | `[]` per-item — kept off the hot path |
| `GET /api/courier/orders/active` (list) | `[]` per-item |
| `GET /api/courier/orders/history` (list) | `[]` per-item |
| `GET /api/courier/orders/:id` | actual list |
| `PUT /api/courier/orders/:id/status` | actual list |

Clients fetch the bytes via the `:photo` GET endpoints — `id` from `PhotoMeta` plugs straight into the URL.

### Streaming GET
- `Content-Type: image/jpeg` or `image/png` (derived from the stored extension).
- Body: `StreamableFile` over `fs.createReadStream`. No `Content-Length` is set — Express handles chunked encoding.

Browsers cannot use `<img src="…">` directly because the `Authorization: Bearer …` header isn't settable on `<img>`. Admin UI fetches via XHR/`fetch`, then renders the resulting `Blob` URL.

## Behaviour notes

- Foreign-order access (POST or GET) is always **404, not 403**, mirroring the rule in `orders.md`. Admin-side GET sees every photo, but ParseUUIDPipe + the row-existence check still gate the response.
- Photos are not deleted by application code today. The `Order` → `OrderPhoto` relation in `schema.prisma` carries `onDelete: Cascade`, so deleting an order would also drop its photo rows — but no admin endpoint deletes orders, so in practice photos persist until the cleanup cron sweeps them.
- There is no quota or per-order photo limit. Each upload is a fresh row.
- `updatedAt` does not exist on `OrderPhoto`; the row is effectively append-only after the post-write `filePath` patch.

## What is NOT here yet

- `MulterError` → 413 mapping → Stage 2.13 (global exception filter).
- class-validator on multipart file fields — out of scope; Multer + manual MIME/size checks in `PhotosService.uploadForCourier` still own that (see `validation.md`).
- Realtime `orders:photo-uploaded` event → not in the plan; would slot into Stage 2.9 if needed by the admin live-table.
- DELETE endpoint → out of scope; cron + cascade are the only deletion paths.
- Filesystem-side orphan sweep (file present, row missing) → out of scope; only the row-driven path is implemented.

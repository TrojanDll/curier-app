# Backups — Backend + Admin Reference

App-level backup / restore of the whole data set as portable ZIP archives.
Source: `backend/src/backups/` + admin `src/app/(authenticated)/backups/`.
Admin-only. No `pg_dump` dependency — the same code path runs in dev (Windows)
and the Alpine production image.

## Why app-level (not pg_dump)

The backend image is `node:22-alpine` with no Postgres client. A backup is
produced by reading every table through Prisma and bundling the photo files
from disk. This keeps one portable format used for **all** four verbs the
operator needs — download, restore, import, export — and lets a backup made on
one installation be imported into another.

## Endpoints

All admin-only (`@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(['admin'])`),
mounted under `/api/*` via the global prefix.

| Method | Path | Status | Body in | Body out |
|---|---|---|---|---|
| GET | `/api/admin/backups` | 200 | — | `BackupMeta[]` (newest first) |
| POST | `/api/admin/backups` | 201 | `CreateBackupDto` (`{ note? }`) | `BackupMeta` |
| POST | `/api/admin/backups/import` | 201 | multipart, field `file` | `BackupMeta` |
| GET | `/api/admin/backups/:id/download` | 200 | — | `application/zip` stream |
| POST | `/api/admin/backups/:id/restore` | 200 | — | `RestoreResult` |
| DELETE | `/api/admin/backups/:id` | 204 | — | — |

`:id` format is `YYYYMMDD-HHMMSS-<6hex>`; the service rejects anything else
(`assertValidId`) so the id can never be used for path traversal. Route order
puts the static `import` POST before `:id/restore`.

### `BackupMeta`

```ts
{
  id: string;                 // "20260530-120000-ab12cd"
  fileName: string;           // "<id>.zip"
  createdAt: string;          // ISO — when the file appeared on THIS deployment
  contentCreatedAt: string;   // ISO — manifest.createdAt (snapshot moment)
  sizeBytes: number;
  formatVersion: number;      // 1
  stackVersion: string;
  counts: { admins, couriers, orders, orderPhotos, appSettings };
  photoCount: number;
  photoBytes: number;
  origin: "manual" | "imported" | "pre-restore";
  createdBy: string | null;   // admin username, or "system" for auto snapshots
  note: string | null;
}
```

`RestoreResult`: `{ restored: true, restoredFrom, safetySnapshotId, counts }`.

## Archive format (`formatVersion: 1`)

```
<id>.zip
├── manifest.json          — BackupManifest (format version, counts, photo stats)
├── data/
│   ├── admins.json        — full-row JSON arrays, one per table
│   ├── couriers.json
│   ├── orders.json        — orders[].price is a string (Decimal, exact)
│   ├── order_photos.json
│   └── app_settings.json
└── uploads/
    └── <orderId>/<photoId>.jpg   — mirror of PHOTO_UPLOAD_DIR
```

- Dates serialize as ISO strings (JSON has no date type) and are revived to
  `Date` on restore via the per-table `DATE_FIELDS` map.
- `refresh_tokens` is **excluded** — ephemeral, security-sensitive auth state.
  A restore wipes all sessions instead of reloading old tokens.

## History lives on disk, not in the DB

Each archive has a sibling `<id>.meta.json` sidecar in `BACKUP_DIR`. `list()`
reads the sidecars (skipping any whose `.zip` is gone). This is deliberate:
restore truncates and reloads the DB, so storing history in a table would erase
the very list the operator browses. The filesystem is the source of truth.

## Restore semantics (destructive)

`restore(id)`:
1. Takes a `pre-restore` safety snapshot of the **current** state first, so the
   operation is reversible (`safetySnapshotId` in the response).
2. Reads + validates the archive (`formatVersion` must match).
3. In one `$transaction` (120s timeout): `deleteMany` children→parents
   (order_photos, orders, refresh_tokens, couriers, admins, app_settings), then
   `createMany` parents→children (admins, couriers, orders, order_photos,
   app_settings). FK order is what makes this safe.
4. Replaces the uploads dir contents with the archive's photos (zip-slip
   guarded; best-effort — a partial photo restore is a missing-image UX issue,
   not data loss).

If the transaction throws it rolls back with photos untouched (they are wiped
only after commit).

### Session impact

The JWT strategy is stateless (no per-request DB check), so the operator's
access token keeps working until it expires (~15m); refresh tokens are wiped,
so the next refresh forces a re-login. **For that re-login to succeed the
admin's account must exist in the restored backup.** The admin UI spells this
out in the restore confirmation. The `pre-restore` snapshot is the escape
hatch.

## Concurrency

A process-local lock (`busy`) lets only one mutating op (create / restore /
import) run at a time — a second returns 409. Fine for the single-instance
backend (§16). `restore` calls the lock-free `snapshot()` internally for its
safety copy so it doesn't deadlock on its own lock.

## Storage / config

| Var | Default | Meaning |
|---|---|---|
| `BACKUP_DIR` | `./backups` (dev), `/app/backups` (image) | Where archives + sidecars live |
| `BACKUP_MAX_IMPORT_MB` | `2048` | Multer ceiling for an imported ZIP |

`BACKUP_DIR` is a named Docker volume (`backups`) in both compose files, baked
into the backend image like `uploads`. Survives `docker compose down` (not
`down -v`) and stack updates.

## Admin UI

`/backups` page (`BackupsClient.tsx`):
- **Создать бэкап** (+ optional note) and **Импортировать из файла** (hidden
  `<input type=file accept=.zip>`).
- **История** table: date, origin badge, contents (orders/couriers/photos),
  size, author, actions.
- Per row: **Скачать** (a plain `<a href={backupDownloadUrl(id)}>` — the
  browser sends the HttpOnly cookie, the BFF adds Bearer, the backend streams
  with `Content-Disposition: attachment`), **Восстановить** (window.confirm with
  the destructive warning), **Удалить**.
- Hooks in `admin/src/lib/api/backups.ts`; query key `backupKeys`. After a
  successful restore the client invalidates the **entire** query cache.

## Wire path notes

Download and import flow through the catch-all BFF proxy
(`app/api/[...path]/route.ts`): it forwards binary bodies and passes
`Content-Disposition` / `Content-Type` through (`content-length` is stripped —
harmless, the stream is chunked). The proxy buffers the whole body in memory, so
very large archives are bounded by BFF memory — acceptable at the §16
single-instance scale.

## What is NOT here yet

- **Scheduled / automatic backups** — creation is manual (button) or the
  implicit `pre-restore` snapshot. Wire a cron to `POST /api/admin/backups` if
  unattended backups are needed.
- **Off-box / remote storage** — archives live in a local volume. Copy them
  off-box (download, or `docker cp`) for disaster recovery.
- **Encryption** — archives are plain ZIP. They contain password *hashes*
  (bcrypt), never plaintext, but treat a downloaded backup as sensitive.
- **Selective / partial restore** — restore is all-or-nothing across the table
  set. There is no "restore only orders".
- **Cross-version migration** — import rejects a `formatVersion` it doesn't
  recognise rather than migrating it.

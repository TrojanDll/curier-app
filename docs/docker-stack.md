# Docker Stack — Production Compose Reference

Stage 14.5. The shippable artifact per §1: one archive, one
`docker compose up -d --build`, three services online.

## Layout

```
/docker/
├── docker-compose.yml      # the stack (db, backend, admin)
└── .env.example            # template (committed); real .env is gitignored
/backend/
├── Dockerfile              # multi-stage NestJS image (§14.5.1)
└── .dockerignore
/admin/
├── Dockerfile              # 3-stage Next.js standalone image (§14.5.2)
├── .dockerignore
└── next.config.ts          # `output: "standalone"` enables the slim build
```

## Services

| Service | Image | Port (host → container) | Volume | Depends on |
|---|---|---|---|---|
| `db` | `postgres:16-alpine` | *(internal only)* | `db_data:/var/lib/postgresql/data` | — |
| `backend` | built from `/backend` | `${BACKEND_PORT:-8081}:8081` | `uploads:/app/uploads` | `db` (healthy) |
| `admin` | built from `/admin` | `${ADMIN_PORT:-3000}:3000` | — | `backend` (healthy) |

All three: `restart: unless-stopped`. Single default bridge network;
services reach each other by DNS name (`db`, `backend`, `admin`).

## Healthchecks (§14.5.5)

| Service | Probe | Why |
|---|---|---|
| `db` | `pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB`, 10s/5s/6 | Exercises auth + the named database, not just the postmaster socket. `$$VAR` keeps the literal for the in-container shell — postgres:alpine exports POSTGRES_* but not the compose-level DB_*. |
| `backend` | `wget --spider http://localhost:8081/health` (defined in the image's `HEALTHCHECK`, 30s/5s/3, 30s start_period) | `/health` is the DB-free liveness route from Stage 2.12. Image-level HEALTHCHECK propagates to compose automatically. |
| `admin` | `wget --spider http://localhost:3000/` (defined in the image's `HEALTHCHECK`, 30s/5s/3, 20s start_period) | Next's standalone server handles `/` fine for a probe; a dedicated `/api/health` BFF route is out of scope for §14.5. |

`depends_on: condition: service_healthy` is what makes the chain
deterministic — backend won't start until Postgres accepts auth, admin
won't start until the backend's `/health` is up.

## Required env (set in `/docker/.env`)

The `.example` ships with safe defaults commented out; only the four
secrets below have no fallback:

| Var | Purpose | How |
|---|---|---|
| `DB_PASSWORD` | Postgres user password | any strong random string |
| `JWT_SECRET` | Backend JWT signing key | `openssl rand -base64 64` |
| `INITIAL_ADMIN_USERNAME` | First admin login (auto-seed) | usually `admin` |
| `INITIAL_ADMIN_PASSWORD` | First admin password (auto-seed) | change after first login from UI |

Optional vars (defaults inline):
- `DB_USER` (default `curier`), `DB_NAME` (default `curier`)
- `JWT_ACCESS_TTL` (15m), `JWT_REFRESH_TTL` (30d)
- `INITIAL_ADMIN_FULL_NAME` ("Initial Admin")
- `PHOTO_TTL_DAYS` (30 — but admin UI can override at runtime via
  `app_settings`; this only seeds the initial row)
- `PHOTO_MAX_SIZE_MB` (10)
- `LOG_LEVEL` (`info`)
- `BACKEND_PORT` (8081), `ADMIN_PORT` (3000) — only if those host
  ports are taken on the deploy box

## How `BACKEND_API_URL` works

The admin BFF (`/admin/api/...` routes) proxies to the backend with a
server-only env var. In production the value is the compose-internal
DNS: `http://backend:8081`.

It's passed twice:
1. As a `build_args` on the admin image so `next build` captures it
   for any place Next traces `process.env.BACKEND_API_URL` at build
   time.
2. As a runtime `environment` value so the running BFF reads the
   current value on every request.

Both lines must agree. If you ever change the backend service name in
compose, update both.

## Volumes

| Volume | Owner | What's in it | When to back up |
|---|---|---|---|
| `db_data` | postgres user | Postgres data dir (tables, indexes, WAL) | **Critical.** Daily, off-box. |
| `uploads` | backend `node:node` | Courier photo files under `/app/uploads/<order_id>/<photo_id>.jpg`. Filenames stay in `order_photos.file_path` in the DB. | Daily-ish; cheap to lose if you accept the missing-photo UX (`expires_at` cleanup eventually catches up). |

Both are named volumes so `docker compose down` (without `-v`) keeps
data; `down -v` wipes them. Production back-up: `docker run --rm -v
docker_db_data:/data -v $PWD:/backup alpine tar czf /backup/db.tgz
-C /data .` (same recipe for `uploads`).

## Build commands

From `/docker/`:

```bash
docker compose --env-file .env up -d --build         # bring everything up
docker compose --env-file .env logs -f backend       # tail backend logs
docker compose --env-file .env exec backend sh       # exec into backend
docker compose --env-file .env exec db psql -U $DB_USER $DB_NAME   # psql
docker compose down                                  # stop, keep data
docker compose down -v                               # stop + wipe volumes
```

`--build` rebuilds only the services whose Dockerfile or build context
changed (`.dockerignore` controls the latter).

## Migrations

The backend container's `CMD` is `prisma migrate deploy && node
dist/main`. On every restart:
1. Apply outstanding migrations from `/app/prisma/migrations` (already
   baked into the image) — idempotent, no-ops if already applied.
2. Start the NestJS app.

You never run `prisma migrate` from the host. Every migration is
committed to the repo and ships in the image.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `db-1: pg_isready: connection refused` for ~20s | Postgres still initialising | Wait — `start_period: 20s` covers normal init. If it persists, check `DB_PASSWORD` doesn't have shell-special chars. |
| Backend stuck on `migrate deploy`, container restart-looping | DB schema drift (someone hand-edited tables) | `docker compose exec db psql -U $DB_USER $DB_NAME` and inspect `_prisma_migrations`. |
| Admin container healthy but UI hits CORS / 401 | `BACKEND_API_URL` mismatch (host vs compose name) | Both build-arg and env must be `http://backend:8081`. |
| Port already allocated | Host port collision | Set `BACKEND_PORT` / `ADMIN_PORT` to free values in `.env`. |

## What is NOT here

- **HTTPS.** `§16` mandates plain HTTP for the SaaS — TLS termination
  is the responsibility of whatever fronts this box (Caddy, nginx,
  Traefik). The compose stack itself listens HTTP.
- **Backups.** Volume backup recipe above is manual — wire it into
  cron or a backup service per your ops standard.
- **Horizontal scaling.** Single-instance backend by design (§16). The
  `app_settings` cache is in-process; multi-pod would need a
  cache-invalidation channel (see `docs/settings.md` "What is NOT
  here yet").
- **CI builds.** `docker buildx bake` + GHCR push is straightforward
  if it becomes useful, but every deploy currently re-builds from the
  source archive on the target box.

# Backend Conventions — Курьерский SaaS

Cross-cutting backend conventions that every feature module on Stage 2 follows. Read once; module-specific docs (`auth.md`, `couriers.md`, ...) extend it.

## Tooling

| Command | Purpose |
|---|---|
| `docker compose -f docker-compose.dev.yml up -d` | Bring up dev Postgres on **port 5433** (not 5432 — avoids native installs; not 55432 — Windows Hyper-V dynamic exclusions). |
| `docker compose -f docker-compose.dev.yml ps` | Verify container is `Up (healthy)`. |
| `cd backend && npm run build` | TS compile via `nest build`. Must be clean before commit. |
| `cd backend && npm run lint` | ESLint --fix. Must be clean before commit. |
| `cd backend && npx prisma migrate status` | Confirms `Database schema is up to date!` |
| `cd backend && npm run start` | One-shot dev server for manual e2e (not `start:dev` — avoids watcher CPU). |

## DTO + controller pattern

DTOs are class-validator classes — see `validation.md` for the pipe config + decorator patterns.

- Optional fields typed as `field?: T | null`. PATCH ignores omitted keys; explicit `null` clears the value.
- Every `:id` path segment uses `ParseUUIDPipe` so malformed UUIDs return 400 before any DB query.
- One controller per role: `AdminXxxController`, `CourierXxxController`, each with `@UseGuards(JwtAuthGuard, RolesGuard) @Roles([...])` at class level.
- Courier-side controllers read the user id from `@CurrentUser()` only — never from URL/body — so a courier cannot read or modify someone else's row.

## Server-side list query

Canonical format (§15.9): `?page=1&pageSize=20&search=&sortBy=&order=asc&status=`.

| Param | Default | Validation |
|---|---|---|
| `page` | `1` | `>= 1`; non-numeric → fallback. |
| `pageSize` | `20` | Clamped to `[1, 100]`. |
| `search` | empty | Case-insensitive `contains` over module-specific fields. |
| `sortBy` | `createdAt` | **Whitelist per module** — never accept arbitrary column names (no `password_hash` ORDER BY). |
| `order` | `desc` | `asc` or `desc` only. |
| `status` | `all` | Module-specific enum plus `all`. |

Response envelope: `{ items: T[], total, page, pageSize }`.

## Manual e2e testing

Automated tests are deferred to Stage 7. Until then, every closed subtask must carry an end-to-end check using:

- **PowerShell `Invoke-WebRequest` with try/catch**, NOT `curl.exe`. Curl + PowerShell escape rules is hell: single-quoted args fragment on spaces, `-w` markers vanish in array splat, body JSON breaks. PS-native is reliable. See the §14.2.4 closing test in git history for a worked example.
- **postgres MCP** for seed/inspect/cleanup. Never leave test data in dev DB.
- **One-shot `npm run start`** in the background, poll port 8081, `Stop-Process` by PID at the end.

Skeleton helper:

```powershell
function Try-Req {
  param($Method, $Url, $Body, $Token)
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $params = @{ Uri = $Url; Method = $Method; Headers = $headers }
  if ($Body) {
    $params['Body'] = ($Body | ConvertTo-Json -Compress)
    $params['ContentType'] = 'application/json'
  }
  try {
    $r = Invoke-WebRequest @params -UseBasicParsing
    return @{ Status = [int]$r.StatusCode; Json = $r.Content | ConvertFrom-Json }
  } catch {
    $rs = $_.Exception.Response
    if ($rs) {
      $sr = New-Object System.IO.StreamReader($rs.GetResponseStream())
      $body = $sr.ReadToEnd(); $sr.Close()
      $j = try { $body | ConvertFrom-Json } catch { $null }
      return @{ Status = [int]$rs.StatusCode; Json = $j }
    }
    return @{ Status = 0; Json = $null }
  }
}
```

Each assertion: `function Pass($s, $cond) { $tag = if ($cond) { 'PASS' } else { 'FAIL' }; Write-Host "[$tag] $s" }`.

## Commit style

```
<type>(<scope>): <short summary>

- bullet detailing what changed
- bullet detailing the why / what's tricky
- ...

Verified <one-paragraph block of what was manually checked end-to-end>.

Tracks §X.Y.Z.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

- `type` ∈ `feat | fix | chore | docs | refactor`.
- `scope` ∈ `backend | admin | android | docs`.
- Always create a new commit; never `--amend` (a hook failure means no commit happened — amend would rewrite the previous one).
- Never `--no-verify`. Fix the hook.
- **Never commit `.claude/settings.local.json`** — it's the user's personal file.

## Documentation cache

On closing a module:
1. Add `docs/<module>.md` containing: endpoints table, response shapes, query format if paginated, behaviour notes, and a "what is NOT here yet" section pointing at deferred subtasks.
2. Add a one-line entry to `docs/INDEX.md`.
3. Commit separately: `docs(backend): cache <Module> reference card`.

## Progress protocol (§0 of completion_plan.md)

- Flip `[ ]` → `[x]` in `Documentation/completion_plan.md` immediately after the code is committed (not before).
- For in-progress work: keep `[ ]` and append `(in progress: ...)` inline.
- The plan file is the **only** source of truth for progress.
- Do **not** use `TodoWrite`, do **not** create `change_log.md` / `feedback_journal.md` / `iterations.md` — the user removed those journals deliberately.
- `~/.claude/projects/.../memory/MEMORY.md` records cross-session facts, not progress. Update `project_status.md` after closing each subtask.

## What is already in place — do not rebuild

| Provided by | What |
|---|---|
| `AuthModule` (see `auth.md`) | `JwtAuthGuard`, `RolesGuard`, `@Roles([...])`, `@CurrentUser()`, `JwtPayload` / `AuthenticatedUser` types |
| `auth/password.util.ts` | `hashPassword` / `comparePassword` (bcrypt cost 10) |
| `auth/ttl.util.ts` | `parseTtlMs` / `parseTtlSec` for `30s` / `15m` / `2h` / `30d` strings |
| `main.ts` | `app.setGlobalPrefix('api')` — controllers do **not** include `/api` in paths |
| `main.ts` / `app.module.ts` | Pino logger, `/health` autoLog filter, `bufferLogs`, `enableShutdownHooks` |
| `prisma/schema.prisma` | All v2 tables migrated. Models in camelCase, DB columns in snake_case via `@map`. |
| `noUncheckedIndexedAccess` (tsconfig) | Be explicit with regex captures and array indexing — TS will not narrow `match[1]` from `string \| undefined` automatically. |

## Language

- User communication: **Russian**.
- Code comments and documentation files: **English**.
- User manuals in `docs/` (DEPLOYMENT, ADMIN/COURIER USER MANUAL — Stage 6): **Russian**.

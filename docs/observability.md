# Observability — Backend Reference

NestJS request logging, request-id correlation and liveness probe (Stage
2.12). Sources: `backend/src/app.module.ts` (Pino config) and
`backend/src/health/`.

## Endpoints

| Method | Path | Auth | Status | Body out |
|---|---|---|---|---|
| GET | `/health` | none | 200 | `{ "status": "ok" }` |

`/health` is **outside** the global `/api` prefix —
`app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: GET }] })`.
External probes (Docker healthcheck, k8s liveness, uptime monitors) hit
`http://host:8081/health` directly. `/api/health` returns 404 by design.

The handler is liveness-only — no DB ping, no module health roll-up. Adding
a readiness endpoint with DB checks is a future task if probes ever need to
gate traffic on schema/DB state.

## Request ID correlation

| Header | Direction | Behaviour |
|---|---|---|
| `x-request-id` | inbound | If non-blank, used as `req.id`. |
| `x-request-id` | outbound | Always set in the response, echoing the inbound value or the auto-generated one. |

Generation logic lives in `pinoHttp.genReqId` so trust + echo are decided
in one place:

```ts
genReqId: (req, res) => {
  const raw = req.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const id = (typeof candidate === 'string' && candidate.trim().length > 0)
    ? candidate.trim()
    : randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}
```

Notes:

- Inbound values are not validated as UUIDs — class-validator on headers
  belongs in §14.2.14 if we add it. For now the contract is "non-blank
  string"; pretty much any caller-chosen tag is fine.
- The id is exposed on every log line via the existing
  `serializers.req → { id, method, url }`.

## Per-status log level

`pinoHttp.customLogLevel` maps response status to pino level:

| Outcome | Level |
|---|---|
| Thrown error or `statusCode >= 500` | `error` |
| `400 <= statusCode < 500` | `warn` |
| Everything else (including 2xx, 3xx) | `info` |

`/health` traffic is dropped entirely by `autoLogging.ignore` so probes do
not push real traffic out of the log window.

## Log shape

| Mode | Output | When |
|---|---|---|
| dev (`NODE_ENV !== production`) | pino-pretty single-line, `pid`/`hostname` hidden, `req`/`res`/`responseTime` kept | local `npm run start` |
| prod (`NODE_ENV === production`) | JSON-on-stdout (no transport) | Docker / production |

Dev pretty example after a 401:

```
[time] WARN: - request completed {"req":{"id":"<uuid>","method":"GET","url":"/api/admin/orders"},"res":{"statusCode":401},"responseTime":1}
```

The `id` field there is the same value returned via `x-request-id` so a
client can grep the backend log by the response header it received.

## Environment

| Var | Default | Effect |
|---|---|---|
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | pino root level |
| `NODE_ENV` | `development` | toggles pino-pretty transport |

## What is NOT here yet

- Readiness probe (DB-aware) — not needed until §14.5 healthchecks demand it.
- Centralised access log shipping (Loki / Grafana) — out of v2 scope.
- Sampling / rate-limiting noisy log lines — not needed at current traffic.

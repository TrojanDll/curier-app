# docs/INDEX.md

Project documentation cache. Each entry links to a detailed doc file.

<!-- Формат: - [Title](file.md) — одна строка описания -->

- [Backend Conventions](backend-conventions.md) — tooling, DTO+controller patterns, list query format, e2e testing helper, commit style, progress protocol
- [Auth — Backend Reference](auth.md) — JWT/refresh endpoints, guards, decorators, payload shape (Stage 2.3)
- [Couriers — Backend Reference](couriers.md) — admin CRUD + courier self-service endpoints, list query format, response shapes (Stage 2.4)
- [Orders — Backend Reference](orders.md) — admin CRUD + courier status flow, order_number sequence, reassign + transition rules (Stage 2.5)
- [Assignment — Backend Reference](assignment.md) — auto-assign + queue drainer, advisory lock + CAS, eligibility/ordering rules, trigger points (Stage 2.6)
- [Photos — Backend Reference](photos.md) — multipart upload + auth-checked streaming, MIME/size constraints, atomic DB+disk write, embedded photo metadata in order detail (Stage 2.7)
- [Statistics — Backend Reference](statistics.md) — admin overview/per-courier breakdown + courier self-stats, period resolution, bucket granularity, metric semantics (Stage 2.8)
- [Realtime — Backend Reference](realtime.md) — Socket.IO `/realtime` namespace, JWT handshake, `admin` + `courier:<id>` rooms, event/trigger map (Stage 2.9)
- [Seed — Backend Reference](seed.md) — bootstrap-time first-admin auto-seed, env vars, decision matrix, idempotency rules (Stage 2.11)
- [Observability — Backend Reference](observability.md) — `/health` liveness probe, `x-request-id` correlation, per-status pino log levels, dev vs prod log shape (Stage 2.12)
- [Exception Filter — Backend Reference](exceptions.md) — global error envelope, HttpException/Prisma/Multer mapping, logging policy, APP_FILTER vs useGlobalFilters (Stage 2.13)
- [Input Validation — Backend Reference](validation.md) — global ValidationPipe options, DTO patterns (nullable PATCH, pagination, comma-split enum, ISO dates), service contract change, DTO inventory (Stage 2.14)
- [Admin API Client — Reference](admin-api-client.md) — axios singleton + ApiError + QueryClient defaults + QueryProvider, env config, what each piece is for (Stage 3.1)

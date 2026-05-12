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
- [Settings — Backend Reference](settings.md) — admin-editable runtime tunables (photo TTL), singleton `app_settings` row, bootstrap seeding, live read from PhotosService (Stage 2.15 / §14.3.6)
- [Observability — Backend Reference](observability.md) — `/health` liveness probe, `x-request-id` correlation, per-status pino log levels, dev vs prod log shape (Stage 2.12)
- [Exception Filter — Backend Reference](exceptions.md) — global error envelope, HttpException/Prisma/Multer mapping, logging policy, APP_FILTER vs useGlobalFilters (Stage 2.13)
- [Input Validation — Backend Reference](validation.md) — global ValidationPipe options, DTO patterns (nullable PATCH, pagination, comma-split enum, ISO dates), service contract change, DTO inventory (Stage 2.14)
- [Admin API Client — Reference](admin-api-client.md) — axios singleton + ApiError + QueryClient defaults + QueryProvider, env config, what each piece is for (Stage 3.1)
- [Admin Auth — BFF + HttpOnly Cookies](admin-auth.md) — Next BFF flow (login/logout/[...path]), cookie contract, auto-refresh on 401, useLogin/useLogout/useUser API (Stage 3.2)
- [Admin Orders — API Integration](admin-orders.md) — orders/couriers hooks, query-key factories, filter mapping, debounced search, reassign UX (Stage 3.3)
- [Admin Couriers — API Integration](admin-couriers.md) — couriers CRUD hooks (create/update/pause/resume/fire/reset-password), drawer-driven forms, filter mapping, three-state badge rationale (Stage 3.4)
- [Admin Statistics — API Integration](admin-statistics.md) — overview + per-courier hooks, period→bucket→label mapping, KPI/charts/breakdown table layout, placeholderData strategy (Stage 3.5)
- [Admin Settings — API Integration](admin-settings.md) — settings GET/PATCH hooks, change-password mutation, TTL form behaviour + last-updated hint, password security flow (Stage 3.6)
- [Admin Realtime — Socket.IO Integration](admin-realtime.md) — BFF token endpoint + RealtimeProvider, handshake flow, event→cache invalidation map, lifecycle/reconnect handling (Stage 3.7)
- [Admin Order Photos — Drawer Integration](admin-order-photos.md) — PhotosSection + PhotoLightbox в drawer заказа, `<img>` через BFF-proxy, portal в body, fallback'ы загрузки (Stage 3.8)

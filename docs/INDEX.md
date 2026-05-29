# docs/INDEX.md

Project documentation cache. Each entry links to a detailed doc file.

<!-- Формат: - [Title](file.md) — одна строка описания -->

## User-facing manuals (Russian)

- [DEPLOYMENT](DEPLOYMENT.md) — пошаговая инструкция для владельца сервера: docker, .env, запуск стека, бэкап, обновление (Stage 14.6.1)
- [ADMIN_USER_MANUAL](ADMIN_USER_MANUAL.md) — мануал администратора: курьеры, заказы, статистика, настройки, troubleshooting (Stage 14.6.2)
- [COURIER_USER_MANUAL](COURIER_USER_MANUAL.md) — мануал курьера: установка APK, ввод URL сервера, статусы, фото, поддержка (Stage 14.6.3)

## Module reference (English)


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
- [Android Server Config](android-server-config.md) — ServerConfigManager + runtime BASE_URL, ServerConfigFragment + health-check, Profile change-server flow, reset механика (Stage 4.1–4.2 / §7.1–7.3)
- [Android API Integration](android-api-integration.md) — wire format (no envelope, camelCase, UUID), DTO ↔ NestJS endpoints, JwtUtils, Room v3, error mapping, paused-courier banner (Stage 4.3–4.4 / §7.4–7.5)
- [Android Realtime](android-realtime.md) — Socket.IO `/realtime` handshake, RealtimeManager singleton, event → ViewModel map, reconnect/lifecycle policy (Stage 4.5 / §7.6–7.7)
- [Android App Settings](android-app-settings.md) — Profile info card (photo TTL + support contact) via `GET /api/courier/settings`, repo+DI+UI map, fallback text policy (§7.8)
- [Android Release Build](android-release-build.md) — keystore.properties + signingConfigs, R8 minify + shrinkResources, ProGuard keep matrix, versioning convention, apksigner verify (Stage 4.6 / §7.9)
- [Docker Stack](docker-stack.md) — production compose (db + backend + admin), healthchecks/restart, BACKEND_API_URL wiring, env contract, volume backup recipe, troubleshooting (Stage 14.5)
- [Android Unit Testing](android-testing.md) — JVM test toolchain, ViewModel skeleton, realtime/SharedFlow mocking, Android-stub traps, current coverage matrix (§14.7.1)
- [Backend Unit Testing](backend-testing.md) — Jest toolchain, extract-then-test pattern, pure-policy modules (transitions/queries/eligibility), coverage matrix (§14.7.2 + §14.7.3 e2e)
- [Admin Playwright Testing](admin-testing.md) — Playwright config + webServer pair, login-flow coverage, locator-hygiene notes (§14.7.5)
- [In-App Update & Deploy](app-update.md) — Android проверяет GitHub Releases (UpdateManager/FileProvider), CI собирает подписанный APK → GitHub Release, отдельный workflow авто-деплоит backend+admin на VPS; secrets/keystore, подписи

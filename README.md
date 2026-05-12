# Курьер SaaS

Self-hosted решение для курьерской службы: подписанное Android-приложение + админ-панель + backend, всё в одном архиве. Один экземпляр = одна компания.

```
┌──────────────┐      ┌──────────────┐      ┌────────────┐
│ Android-APK  │  →   │ NestJS API   │  ←   │ Next.js    │
│ (курьеры)    │      │ + PostgreSQL │      │ (админ)    │
└──────────────┘      └──────────────┘      └────────────┘
                              ↑
                       docker compose
```

## Что это даёт

- **Админ** через веб-панель создаёт курьеров, заводит заказы, видит статистику, настраивает TTL фото и контакт поддержки.
- **Курьеры** ставят APK, вводят адрес сервера один раз, получают заказы push-ом через WebSocket, обновляют статусы, делают фото.
- **Backend** — NestJS + Prisma + PostgreSQL, JWT + refresh-токены, Socket.IO для realtime, авто-назначение «дольше всех на базе» (§8).

Один deployment = одна компания. Multi-tenancy нет — это намеренно упрощает всё.

---

## Быстрый старт (Linux-сервер)

```bash
# 1. Поставьте Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# 2. Распакуйте архив (или git clone)
mkdir -p /opt/curier && cd /opt/curier
tar xzf ~/curier-v2.tar.gz

# 3. Настройте .env
cd docker
cp .env.example .env
nano .env            # обязательно: DB_PASSWORD, JWT_SECRET, INITIAL_ADMIN_*

# 4. Запустите
docker compose --env-file .env up -d --build

# 5. Откройте админку
xdg-open http://localhost:3000      # или ваш внешний IP
```

Подробно — [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Раскладка репозитория

| Папка | Что |
|---|---|
| `/android` | Kotlin-клиент. Подписанный APK собирается через `./gradlew assembleRelease` (нужен keystore — см. [docs/android-release-build.md](docs/android-release-build.md)) |
| `/admin` | Next.js 16 + Untitled UI + Tailwind v4 + React Query. BFF на тех же роутах через `/api/*` |
| `/backend` | NestJS 11 + Prisma + PostgreSQL 16 + Pino |
| `/docker` | `docker-compose.yml` + `.env.example` — production стек |
| `/docs` | Reference-доки на каждый модуль (English) + пользовательские мануалы (Russian) |
| `/Documentation` | План работ (`completion_plan.md`) и архив исходных артефактов проекта |

---

## Документация

### Для тех, кто разворачивает

- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** — пошагово, от установки Docker до раздачи APK курьерам
- **[docker-stack.md](docs/docker-stack.md)** — справочник по compose-стеку: сервисы, env-переменные, healthchecks, troubleshooting

### Для пользователей

- **[ADMIN_USER_MANUAL.md](docs/ADMIN_USER_MANUAL.md)** — как работать в админ-панели
- **[COURIER_USER_MANUAL.md](docs/COURIER_USER_MANUAL.md)** — как пользоваться курьерским приложением

### Для тех, кто разрабатывает или расширяет

- **[Documentation/completion_plan.md](Documentation/completion_plan.md)** — единственный источник правды по scope и прогрессу
- **[docs/INDEX.md](docs/INDEX.md)** — индекс reference-доков на каждый модуль (auth, orders, photos, realtime, settings, …)
- **[CLAUDE.md](CLAUDE.md)** — инструкции для AI-ассистента, попутно описывают конвенции репозитория

### Для тех, кто пересобирает APK

- **[android-release-build.md](docs/android-release-build.md)** — keystore, R8 minify, ProGuard, signing, apksigner

---

## Технологический стек

| Слой | Технологии |
|---|---|
| Android | Kotlin 2.0, Coroutines + Flow, Retrofit + Moshi, Room, Socket.IO 2.x, Material 3, View Binding, Navigation Component, KSP. Clean Architecture + MVVM. Manual DI (Hilt отключён) |
| Admin | Next.js 16 (App Router, RSC, standalone build), Untitled UI React, Tailwind v4, React Query 5, axios, Recharts |
| Backend | NestJS 11, Prisma 6, PostgreSQL 16, JWT + Passport, Pino, Socket.IO, class-validator, @nestjs/schedule (cron для очистки фото) |
| Auth | JWT access (15 мин) + opaque refresh с ротацией (30 дней). HttpOnly cookies для админки. Auto-refresh через Next BFF |
| Realtime | Socket.IO namespace `/realtime`, rooms `admin` и `courier:<id>`. Без fallback на polling |
| Хранилище | named volumes: `db_data` (Postgres) + `uploads` (фото). Бэкап — `docker run alpine tar czf …` |

---

## Конвенции

- HTTP без HTTPS внутри стека. TLS-termination — задача того, что стоит перед сервером (nginx / Caddy / Traefik / Cloudflare).
- Сервер раскатывается один раз, dev-флоу — `docker compose up -d --build`. Миграции БД применяются автоматически при старте backend.
- Версионирование APK — semver, `versionCode` инкрементируется на каждый ship (§12).
- Документация модулей (`docs/*.md`) на английском, пользовательские мануалы — на русском.

---

## Лицензия

Учебный проект. MIT.

---

## История

Проект перерос v1 (Express + in-memory, один Android-клиент с захардкоженным URL) и теперь — самостоятельный SaaS-стек, который реально раздаётся «как продукт». См. [Documentation/discussion_summary.md](Documentation/discussion_summary.md) для контекста переезда.

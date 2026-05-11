# Completion Plan — Курьерский SaaS

## Document Information
- **Project**: Curier SaaS (Android + Backend + Admin)
- **Version**: 2.0 (расширенный scope)
- **Date Created**: 2026-04-25
- **Status**: Approved — реализация в новой сессии
- **Supersedes**: оригинальный `project_plan.md` (v1.0) в части scope. Старый план остаётся как история.

---

## 0. Progress Tracking Protocol (для Claude)

Этот документ — **источник правды по прогрессу проекта**. Чекбоксы в §7, §14, §15a и в сводке ниже отражают реальное состояние работ.

**Правила работы с чекбоксами:**
1. После завершения любой задачи **сразу** отметить `- [ ]` → `- [x]` через Edit.
2. Если задача выполнена частично — оставить `- [ ]` и добавить инлайн-пометку `(in progress: что именно)`.
3. Если по ходу обнаружена новая подзадача — добавить новый `- [ ]` пункт в нужный раздел, не теряя список.
4. Перед началом каждой новой подзадачи проверять, что в чекбоксах отражена реальность: если пользователь выполнил что-то руками между сессиями, попросить подтвердить и обновить.
5. Не помечать задачу `[x]`, пока соответствующий код/конфиг не закоммичен или явно одобрен пользователем.

### Сводка прогресса по этапам

- [x] §15a — Подготовительные шаги
- [x] §14 Этап 1 — Admin-панель на моках
- [x] §14 Этап 2 — Backend на NestJS
- [ ] §14 Этап 3 — Интеграция Admin ↔ Backend
- [ ] §14 Этап 4 — Доработка Android-клиента (см. §7)
- [ ] §14 Этап 5 — Dockerization
- [ ] §14 Этап 6 — Документация и упаковка
- [ ] §14 Этап 7 — Тесты

Этапная галочка ставится только когда **все** подпункты этапа отмечены.

---

## 1. Финальный deliverable

Self-hosted решение, упакованное в **один архив (или git-репозиторий)**, передаваемое любому предпринимателю. Получатель:
1. Распаковывает архив на Linux-сервере.
2. Запускает `docker compose up -d`.
3. Получает работающий backend + admin-панель + БД.
4. Устанавливает курьерам **универсальный APK** и сообщает им URL своего сервера.
5. Регистрирует курьеров через админку, начинает создавать заказы.

**Целевая модель**: 1 архив = 1 предприятие = 1 инстанс backend + admin + DB. Multi-tenancy внутри одного backend **НЕ реализуем** — это упрощает всё.

---

## 2. Архитектура системы

```
┌─────────────────────┐         ┌─────────────────────┐
│  Android (курьер)   │         │  Browser (админ)    │
│  курьерское APK     │         │  Next.js admin      │
└──────────┬──────────┘         └──────────┬──────────┘
           │ HTTP + WebSocket              │ HTTP + WebSocket
           │                               │
           └───────────────┬───────────────┘
                           ▼
                ┌────────────────────┐
                │  NestJS Backend    │
                │  REST + WS Gateway │
                │  JWT auth          │
                └─────────┬──────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │PostgreSQL│  │Photo FS  │  │Cron jobs │
      │+ Prisma  │  │volume    │  │(cleanup) │
      └──────────┘  └──────────┘  └──────────┘

Всё это поднимается одним docker-compose.yml.
```

### Связь курьера с предприятием
- APK универсальный (один и тот же бинарник для всех).
- При первом запуске → экран **«Подключение к серверу»**: ввод URL `http://server-host:port`.
- URL хранится в `EncryptedSharedPreferences`.
- Затем стандартный экран логина (username/password, выданные администратором этого предприятия).
- Из меню профиля можно «Сменить сервер» → logout + сброс URL.
- *Nice-to-have (отложено)*: QR-код от админа со ссылкой `curier://connect?url=...&user=...&token=...` — упрощает онбординг.

---

## 3. Технологический стек

| Слой | Технология | Комментарий |
|---|---|---|
| Mobile | Kotlin + Android (Clean Architecture + MVVM) | оставляем как есть, дорабатываем |
| Backend | **NestJS 10+** на TypeScript | переписываем с Express |
| ORM / миграции | **Prisma** | заменяет ручной SQL |
| База данных | **PostgreSQL 16** | в Docker, persistent volume |
| Realtime | **Socket.IO** через `@nestjs/websockets` | live-таблицы и push новых заказов курьерам |
| Auth | JWT (access 15 мин + refresh 30 дней), bcrypt для паролей | две сущности: `couriers` и `admins` — раздельные таблицы |
| Admin UI | **Next.js 16 + React 19 + TypeScript** + **Untitled UI React** + Tailwind CSS v4 | App Router |
| Графики (стат-ка) | **Recharts** | интегрировано в Untitled UI |
| Хранение фото | локальный диск, том `./uploads` в Docker | конфигурируемое TTL через cron job |
| Reverse proxy | Caddy (опционально, в `docker-compose`) | для production-домена; для дев — не нужен |
| Контейнеризация | Docker + docker-compose | сервисы: `db`, `backend`, `admin` |
| APK | Gradle + signed release APK | один keystore, конфиг URL через runtime |

---

## 4. Доменная модель и БД (черновик)

### Таблицы PostgreSQL

```
admins
├── id            UUID PK
├── username      TEXT UNIQUE
├── password_hash TEXT
├── full_name     TEXT
├── created_at    TIMESTAMPTZ
└── last_login_at TIMESTAMPTZ NULL

couriers
├── id              UUID PK
├── username        TEXT UNIQUE
├── password_hash   TEXT
├── full_name       TEXT
├── email           TEXT NULL
├── phone           TEXT NULL
├── date_of_birth   DATE NULL
├── is_active       BOOLEAN DEFAULT true     -- "уволен" → false
├── is_paused       BOOLEAN DEFAULT false    -- админ поставил на паузу
├── last_returned_at TIMESTAMPTZ NULL        -- когда последний раз вернулся на базу (для auto-assign)
├── created_at      TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ

orders
├── id                  UUID PK
├── order_number        TEXT UNIQUE          -- человекочитаемый, e.g. "ORD-2026-0001"
├── customer_name       TEXT
├── customer_phone      TEXT
├── delivery_address    TEXT
├── product_description TEXT
├── comments            TEXT NULL
├── price               NUMERIC(10,2) NULL   -- цена заказа; КУРЬЕР НЕ ВИДИТ; админка использует для выручки
├── status              order_status ENUM    -- new, assigned, picked_up, near_customer, delivered, returned
├── courier_id          UUID FK → couriers   NULL до назначения
├── created_by_admin_id UUID FK → admins
├── created_at          TIMESTAMPTZ
├── assigned_at         TIMESTAMPTZ NULL
├── picked_up_at        TIMESTAMPTZ NULL
├── near_customer_at    TIMESTAMPTZ NULL
├── delivered_at        TIMESTAMPTZ NULL
└── returned_at         TIMESTAMPTZ NULL

order_photos
├── id          UUID PK
├── order_id    UUID FK → orders ON DELETE CASCADE
├── file_path   TEXT          -- относительный путь в volume
├── uploaded_at TIMESTAMPTZ
└── expires_at  TIMESTAMPTZ   -- created_at + TTL из конфига; cron чистит просроченные

refresh_tokens
├── id           UUID PK
├── user_id      UUID
├── user_type    user_type ENUM (courier, admin)
├── token_hash   TEXT
├── expires_at   TIMESTAMPTZ
└── revoked      BOOLEAN
```

### ENUM
- `order_status`: `new` → `assigned` → `picked_up` → `near_customer` → `delivered` → `returned`
- `user_type`: `courier`, `admin`

---

## 5. API endpoints (NestJS)

### Auth
| Method | Path | Назначение |
|---|---|---|
| POST | `/api/auth/courier/login` | логин курьера |
| POST | `/api/auth/admin/login` | логин админа |
| POST | `/api/auth/refresh` | обновление токена |
| POST | `/api/auth/logout` | logout (revoke refresh) |

### Курьерские (требуют `role=courier`)
| Method | Path | Назначение |
|---|---|---|
| GET | `/api/courier/profile` | получить профиль |
| PUT | `/api/courier/profile` | обновить email/phone |
| GET | `/api/courier/orders/active` | активные заказы |
| GET | `/api/courier/orders/history?from=&to=` | история |
| GET | `/api/courier/orders/:id` | детали |
| PUT | `/api/courier/orders/:id/status` | смена статуса с валидацией перехода |
| POST | `/api/courier/orders/:id/photo` | загрузка фото (multipart) |
| GET | `/api/courier/statistics?period=24h` | статистика |
| WS | `orders:new` (Socket.IO event) | push нового заказа |

### Админские (требуют `role=admin`)
| Method | Path | Назначение |
|---|---|---|
| **Couriers CRUD** |||
| GET | `/api/admin/couriers` | список + фильтры (active/paused) |
| POST | `/api/admin/couriers` | создать (логин + пароль) |
| GET | `/api/admin/couriers/:id` | детали |
| PATCH | `/api/admin/couriers/:id` | редактировать |
| DELETE | `/api/admin/couriers/:id` | "уволить" → `is_active=false` |
| POST | `/api/admin/couriers/:id/pause` | поставить паузу |
| POST | `/api/admin/couriers/:id/resume` | снять паузу |
| POST | `/api/admin/couriers/:id/reset-password` | сброс пароля |
| **Orders** |||
| GET | `/api/admin/orders?status=&courier_id=&from=&to=` | список с фильтрами |
| POST | `/api/admin/orders` | создать новый — сразу запускается auto-assign |
| GET | `/api/admin/orders/:id` | детали + фото |
| PATCH | `/api/admin/orders/:id` | редактировать (только если `status=new`) |
| POST | `/api/admin/orders/:id/reassign` | переназначить вручную |
| GET | `/api/admin/orders/:id/photo/:photoId` | получить фото |
| **Statistics** |||
| GET | `/api/admin/statistics/overview?from=&to=` | по всему бизнесу |
| GET | `/api/admin/statistics/couriers?from=&to=` | срез по курьерам |
| **Realtime** |||
| WS | `orders:updated` | live-обновления таблицы заказов |
| WS | `couriers:status` | курьер встал на паузу / вернулся на базу |

---

## 6. Admin-панель — экраны

1. **Login** — `/login`
2. **Dashboard** — `/` — карточки: активных заказов, курьеров на смене, среднее время доставки за сутки, выручка за сутки (если внесём поле `price` — см. open questions)
3. **Заказы** — `/orders`
   - Live-таблица (Socket.IO), фильтры по статусу/курьеру/датам
   - Кнопка «Создать заказ» → форма
   - Клик по строке → drawer с деталями + фото + история статусов + кнопка «Переназначить»
4. **Курьеры** — `/couriers`
   - Таблица: имя, телефон, статус (на базе/в работе/на паузе/уволен), активных заказов, доставок за сутки
   - Кнопка «Добавить курьера»
   - Действия: Edit, Pause/Resume, Reset password, «Уволить»
5. **Статистика** — `/statistics`
   - Графики (Recharts): заказы по дням, среднее время доставки, top-курьеры
   - Период: today/week/month/custom
6. **Настройки** — `/settings`
   - TTL фото (дней)
   - Изменить пароль администратора
7. **404 / Loading / Error boundaries**

---

## 7. Доработки Android-клиента

- [ ] **7.1** _(Critical)_ Удалить захардкоженные `BASE_URL` flavors (`emulator` / `physical`) — URL только из runtime-настроек
- [ ] **7.2** _(Critical)_ Экран «Подключение к серверу» — ввод BASE_URL при первом запуске; хранение в EncryptedSharedPreferences
- [ ] **7.3** _(Critical)_ В Settings/Profile добавить «Сменить сервер» (logout + сброс URL)
- [ ] **7.4** _(Critical)_ Адаптировать DTO под новый Nest-backend: UUID вместо int, новые поля, отсутствие `price` у курьера
- [ ] **7.5** _(High)_ Обработка состояния `is_paused` — баннер «Вы на паузе, новые заказы не назначаются»
- [ ] **7.6** _(High)_ Socket.IO клиент: подписка на `orders:new`, автоматическое обновление списка
- [ ] **7.7** _(High)_ Корректная обработка статуса `new` / `assigned` (раньше курьер видел только `assigned`)
- [ ] **7.8** _(Medium)_ Settings → TTL info, contact support
- [ ] **7.9** _(High)_ Release-сборка: создать keystore, signed APK, версионирование

---

## 8. Алгоритм автоназначения

При создании заказа (`POST /api/admin/orders`):
1. Выбрать всех курьеров, у кого `is_active=true AND is_paused=false`.
2. Из них исключить тех, у кого есть заказ со статусом ∈ {assigned, picked_up, near_customer, delivered} (т.е. ещё не вернулся на базу).
3. Из оставшихся (те, кто на базе) выбрать **с минимальным `last_returned_at`** (= дольше всех отдыхает). Если у курьера ни разу не было заказа, считать `last_returned_at = created_at`.
4. Если подходящих нет → заказ создаётся со статусом `new` без `courier_id`. Каждый раз, когда любой курьер возвращается (`status=returned`), запускается **«разгребатель очереди»** — берёт самый старый `new` и назначает этому курьеру.
5. Триггер на изменение `is_paused=false` или `is_active=true` → тоже запускает разгребатель.
6. Курьер получает push через WS `orders:new`.

---

## 9. Live-обновления

- **Socket.IO** через `@nestjs/websockets`, namespace `/realtime`.
- JWT валидируется в `WsGuard` при handshake.
- Rooms:
  - `admin` — все админы получают `orders:updated`, `couriers:status`
  - `courier:<id>` — конкретный курьер получает `orders:new`, `orders:reassigned`
- Fallback на polling не делаем.

---

## 10. Хранение и TTL фото

- Фото хранятся в `./uploads/orders/<order_id>/<photo_id>.jpg` (volume в Docker).
- В таблице `order_photos` поле `expires_at = uploaded_at + TTL` (TTL берётся из настроек админа, дефолт 30 дней).
- Cron-job в Nest (`@nestjs/schedule`) каждый час: удалить просроченные файлы и записи.
- Endpoint доступа к фото проверяет JWT (только админ или курьер-владелец заказа).

---

## 11. Docker и deployment

### Структура репозитория после рефакторинга
```
/curier_mobile
├── android/                  # текущий Android-проект (переехать в подпапку)
│   ├── app/
│   ├── build.gradle.kts
│   └── ...
├── backend/                  # Nest.js
│   ├── src/
│   ├── prisma/
│   ├── Dockerfile
│   └── package.json
├── admin/                    # Next.js
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── .env.example
├── docs/
│   ├── DEPLOYMENT.md          # для администратора-владельца
│   ├── ADMIN_USER_MANUAL.md   # как пользоваться админкой
│   └── COURIER_USER_MANUAL.md # как пользоваться приложением
└── README.md                  # верхнеуровневый: что это, как запустить, ссылки
```

> Решение «переезжать ли Android в подпапку `android/`» отдельный пункт — см. open questions.

### docker-compose.yml (концепт)
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck: ...

  backend:
    build: ../backend
    environment:
      DATABASE_URL: postgres://...
      JWT_SECRET: ${JWT_SECRET}
      PHOTO_TTL_DAYS: 30
      PORT: 8081
    volumes:
      - uploads:/app/uploads
    depends_on:
      db: { condition: service_healthy }
    ports: ["8081:8081"]

  admin:
    build: ../admin
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8081
    depends_on: [backend]
    ports: ["3000:3000"]

volumes:
  db_data:
  uploads:
```

### `.env.example` — все секреты с дефолтами для быстрого старта.

---

## 12. APK distribution

- Один **release APK**, подписанный одним keystore (генерируем 1 раз, храним в безопасности).
- В APK **нет захардкоженного URL** — пользователь вводит при первом запуске.
- Версия APK: `versionName=1.0.0`, `versionCode=1`. Дальше инкремент.
- Распространение: вручную через мессенджеры (Telegram, WhatsApp). Не через Google Play (учебный проект).

---

## 13. Документация

| Файл | Аудитория | Содержание |
|---|---|---|
| `README.md` | разработчик/получатель | что это, ссылки на остальные доки |
| `docs/DEPLOYMENT.md` | владелец сервера | пошагово: установить Docker → распаковать → `.env` → `docker compose up -d` → создать первого админа (CLI команда `npm run create-admin`) → готово |
| `docs/ADMIN_USER_MANUAL.md` | администратор | скриншоты + текст: вход, добавить курьера, создать заказ, мониторинг, статистика, выгрузка APK курьерам |
| `docs/COURIER_USER_MANUAL.md` | курьер | как ввести URL сервера, логин, как менять статусы, как делать фото, частые проблемы |

Все мануалы на русском.

---

## 14. План работ по этапам

### Этап 1 — Admin-панель (стартуем с этого, моки)
- [x] **1.1** Установить Untitled UI React + Tailwind CSS v4 в `/admin`
- [x] **1.2** Layout приложения: sidebar, header, auth middleware
- [x] **1.3** Страница Login (UI без backend, мок)
- [x] **1.4** Скелет страницы Orders (live-таблица, моки)
- [x] **1.5** Скелет страницы Couriers (CRUD, моки)
- [x] **1.6** Скелет страницы Statistics (графики Recharts, моки)
- [x] **1.7** Скелет страницы Settings (TTL фото, смена пароля)
- [x] **1.8** Скелет Dashboard (карточки с метриками, моки)
- [x] **1.9** TypeScript строгая типизация + ESLint конфиг

### Этап 2 — Backend на NestJS
- [x] **2.1** Инициализация Nest-проекта в `/backend` (TypeScript strict, Pino logs)
- [x] **2.2** Prisma schema + первая миграция для всех таблиц (admins, couriers, orders, order_photos, refresh_tokens, ENUMs)
- [x] **2.3** AuthModule: стратегии JWT для admin и courier, refresh-flow
- [x] **2.4** CouriersModule: CRUD + pause/resume + reset-password
- [x] **2.5** OrdersModule: CRUD для админа, status flow для курьера, валидация переходов
- [x] **2.6** Auto-assign сервис + queue-разгребатель (см. §8)
- [x] **2.7** PhotosModule: multipart upload, выдача с auth-проверкой
- [x] **2.8** StatisticsModule: overview + по курьерам
- [x] **2.9** RealtimeGateway (Socket.IO) с rooms `admin` и `courier:<id>`
- [x] **2.10** Cron для удаления просроченных фото (`@nestjs/schedule`)
- [x] **2.11** Авто-сид первого админа из `INITIAL_ADMIN_USERNAME` / `INITIAL_ADMIN_PASSWORD`
- [x] **2.12** Pino logger + request logging middleware
- [x] **2.13** Глобальный exception filter + единый формат ошибок API
- [x] **2.14** Валидация входящих DTO через class-validator

### Этап 3 — Интеграция Admin ↔ Backend
- [x] **3.1** API-клиент в admin (предпочтительно `tanstack/react-query` + `axios`)
- [x] **3.2** Auth-флоу: login → JWT в HttpOnly cookie (через Next.js route handlers) или localStorage
- [ ] **3.3** Подменить моки на реальные запросы — Orders
- [ ] **3.4** Подменить моки на реальные запросы — Couriers
- [ ] **3.5** Подменить моки на реальные запросы — Statistics
- [ ] **3.6** Подменить моки на реальные запросы — Settings
- [ ] **3.7** Socket.IO клиент в admin, обновление таблиц realtime
- [ ] **3.8** Загрузка и просмотр фото доставки в drawer-е заказа

### Этап 4 — Доработка Android-клиента
> Подзадачи дублируют §7. По мере выполнения отмечайте чекбоксы и тут, и там.
- [ ] **4.1** Удалить flavors `emulator`/`physical`, BASE_URL → runtime config (= 7.1)
- [ ] **4.2** Экран «Подключение к серверу» (= 7.2, 7.3)
- [ ] **4.3** Адаптировать DTO под Nest API (= 7.4)
- [ ] **4.4** Обработка `is_paused` (= 7.5)
- [ ] **4.5** Socket.IO Android-клиент (= 7.6, 7.7)
- [ ] **4.6** Сборка signed release APK + keystore (= 7.9)

### Этап 5 — Dockerization
- [ ] **5.1** Dockerfile для backend (multi-stage, Node 22 LTS, prod-сборка)
- [ ] **5.2** Dockerfile для admin (Next.js standalone output, Node 22 LTS)
- [ ] **5.3** `docker-compose.yml` (db, backend, admin) + persistent volumes (db_data, uploads)
- [ ] **5.4** `.env.example` с дефолтами для быстрого старта
- [ ] **5.5** Healthchecks для всех сервисов + restart политики
- [ ] **5.6** End-to-end тест: на чистой Linux-машине `docker compose up -d` поднимает весь стек
- [ ] **5.7** (Опционально) Caddy сервис для HTTPS с Let's Encrypt — закомментирован в compose

### Этап 6 — Документация и упаковка
- [ ] **6.1** `docs/DEPLOYMENT.md` — пошаговая инструкция развёртывания на русском
- [ ] **6.2** `docs/ADMIN_USER_MANUAL.md` — мануал админа со скриншотами
- [ ] **6.3** `docs/COURIER_USER_MANUAL.md` — мануал курьера со скриншотами APK
- [ ] **6.4** Корневой `README.md` — что это, как запустить, ссылки
- [ ] **6.5** Обновить `architecture_design.md` и `dependencies.md` под новый стек
- [ ] **6.6** Подготовить релизный артефакт: git tag + zip-архив + APK файл
- [ ] **6.7** Тестовая «прогонка» документации: пройти DEPLOYMENT.md по шагам на чистой VM

### Этап 7 — Тесты
- [ ] **7.1** Unit tests: ViewModels Android (по `test_plan.md`)
- [ ] **7.2** Unit tests: Nest сервисы (auto-assign, status transitions, auth)
- [ ] **7.3** Integration tests Nest: Prisma + endpoints
- [ ] **7.4** UI tests Android: Espresso для критических флоу
- [ ] **7.5** UI tests Admin: Playwright (login, создание заказа, назначение)
- [ ] **7.6** Покрытие бизнес-логики >70%

---

## 15. Решённые вопросы (зафиксировано 2026-04-25)

1. **Поле `price` у заказа** — **добавляем** как `NUMERIC(10,2) NULL` в таблицу `orders`. **Курьер не видит** стоимость:
   - В DTO `/api/courier/orders/*` поля `price` нет.
   - В DTO `/api/admin/orders/*` поле `price` есть.
   - В Android-моделях поля `price` тоже нет.
   - В форме создания заказа в админке — обязательное (или необязательное — уточнить при реализации формы).
2. **Переезд Android в `/android`** — **делаем**. Перенос в начале новой сессии до старта Этапа 1.
3. **Создание первого админа** — через `INITIAL_ADMIN_USERNAME` + `INITIAL_ADMIN_PASSWORD` в `.env`, автосид при первом старте (вариант c).
4. **Сброс пароля курьера** — админ вводит новый пароль в форме сам (вариант a).
5. **TypeScript strict mode на backend** — да.
6. **Логи backend** — **Pino** (быстрее, JSON-в-stdout, контейнер-friendly, минимальный конфиг). Через `nestjs-pino`.
7. **Node.js в Docker** — **22 LTS**.
8. **Существующий `/backend`** — переименовать в `/backend-old` в начале новой сессии (сохраняем для справки, но убираем из путаницы).
9. **Пагинация админских таблиц** — server-side с поиском с самого начала. Стандартный формат: `?page=1&pageSize=20&search=&sortBy=&order=asc`.
10. **Старые журналы документации** — пользователь разрешил удалить. К удалению в начале новой сессии:
    - `Documentation/change_log.md` (только template, без истории)
    - `Documentation/feedback_journal.md`
    - `Documentation/problem_journal.md`
    - `Documentation/iterations.md` (история выполненных итераций — больше не нужна, актуальное состояние в `completion_plan.md`)

### Документы Documentation/, которые ОСТАЮТСЯ
- `requirements_specification.md` — как историческая v1.0
- `project_plan.md` — как историческая v1.0
- `architecture_design.md` — будет обновлён под новый стек
- `dependencies.md` — будет обновлён
- `risk_register.md` — оставляем
- `test_plan.md` — оставляем (понадобится на Этапе 7)
- `discussion_summary.md` — обновим итогами этого обсуждения
- **`completion_plan.md` — единственный источник правды**

---

## 15a. Подготовительные шаги в начале новой сессии (до Этапа 1)

В таком порядке:
- [x] **15a.1** Прочитать `Documentation/completion_plan.md` целиком
- [x] **15a.2** Удалить устаревшие журналы (см. §15 п. 10): `change_log.md`, `feedback_journal.md`, `problem_journal.md`, `iterations.md`
- [x] **15a.3** Переименовать `/backend` → `/backend-old`
- [x] **15a.4** Создать пустую папку `/backend` для нового Nest-проекта
- [x] **15a.5** Согласовать с пользователем момент переноса Android-проекта в `/android` (ломает пути в Android Studio — отдельным коммитом)
- [x] **15a.6** Выполнить перенос Android в `/android` (после получения согласия — пункт можно отложить, если пользователь хочет позже)
- [x] **15a.7** Закоммитить подготовительные изменения. Получилось два коммита: `chore: prepare repo for v2 scope` (журналы, переименование backend, completion_plan.md) и `chore: move android into /android subfolder` (перенос Android + обновление .gitignore и CLAUDE.md)
- [x] **15a.8** Отметить этап 15a в §0 как завершённый и перейти к Этапу 1.1

---

## 16. Что НЕ делаем (out of scope)

- Multi-tenancy внутри одного backend (1 архив = 1 предприятие)
- iOS-приложение
- Интеграции с курьерскими сервисами (Яндекс.Доставка и т.п.)
- Платежи и эквайринг
- Push-нотификации через FCM (используем WebSocket)
- Real-time GPS трекинг курьера
- Offline-режим в Android-приложении
- Multi-language (только русский)
- Google Play distribution
- HTTPS/Let's Encrypt в дефолтном compose (опционально через Caddy-сервис)

---

## 17. Команды для старта новой сессии

В новой сессии первым делом:
1. Прочитать этот файл (`Documentation/completion_plan.md`).
2. Прочитать `CLAUDE.md` для текущего состояния Android.
3. Получить ответы на вопросы из §15.
4. Стартовать с **Этапа 1.1** — установка Untitled UI React в `/admin`.

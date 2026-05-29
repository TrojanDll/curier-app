# Server Stack Self-Update — Feature Reference

Серверная часть (backend + admin) обновляется по той же **pull-модели**, что и
приложение: единый источник — публичный GitHub проекта. Любой развернувший
проект клиент применяет обновление **по желанию** из админки, не имея никакого
доступа к репозиторию (только анонимный `docker pull` публичных образов).

## Поток

```
коммит в main (backend/** | admin/** | docker/**)
  → CI release-stack.yml: build+push образов в GHCR (:1.0.N + :latest)
                          + GitHub Release stack-v1.0.N (prerelease)
  → клиентский сервер: админка «Обновления сервера» показывает «доступна vX»
  → оператор жмёт «Обновить»
       backend пишет файл-триггер в общий volume updater_ipc
       → sidecar `updater` (docker.sock): docker compose pull && up -d backend admin
       → backend стартует → prisma migrate deploy применяет миграции
```

## Раздача — GHCR (единый источник)

CI публикует 3 **публичных** образа:
`ghcr.io/trojandll/curier-backend`, `…-admin`, `…-updater` (теги `1.0.<run>` +
`latest`). Запись — только через CI (разработчики). Клиент тянет образы
анонимно. `STACK_VERSION` зашивается в backend-образ (`--build-arg`), backend
отдаёт её в `GET /api/admin/system/version`.

> **Один раз вручную:** сделать GHCR-пакеты публичными (GitHub → Packages →
> каждый пакет → Package settings → Change visibility → Public). Иначе клиент
> не сможет выполнить `docker pull`.

## Компоненты

| Часть | Файл | Назначение |
|---|---|---|
| CI | `.github/workflows/release-stack.yml` | build+push образов + GitHub Release `stack-v…` (prerelease) |
| Prod compose | `docker/docker-compose.prod.yml` | стек из GHCR-образов + `updater`; `name: docker` (сохраняет тома) |
| Updater | `docker/updater/` | sidecar: docker.sock + compose, poll триггера, фиксированное действие |
| Backend | `backend/src/system/` | `GET /api/admin/system/version`, `POST …/update`, `GET …/update/status` |
| Admin | `admin/src/app/(authenticated)/system-update/` | страница «Обновления сервера» (версия + кнопка + статус) |

## Backend API (admin-only)

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/admin/system/version` | `{current, latest, updateAvailable, latestNotes, latestUrl, publishedAt}`. latest — последний GitHub-релиз с префиксом `stack-v` (кэш 5 мин). |
| POST | `/api/admin/system/update` | Кладёт `trigger` в `UPDATE_IPC_DIR`. 202. Если уже идёт — `{started:false}`. |
| GET | `/api/admin/system/update/status` | `{status, startedAt, finishedAt, log}` из IPC. |

env backend: `STACK_VERSION` (зашит в образ), `UPDATE_IPC_DIR=/ipc`,
`GITHUB_REPO` (default `TrojanDll/curier-app`).

## Updater-сайдкар — почему так

Контейнер не может корректно пересоздать сам себя, поэтому обновление выполняет
отдельный минимальный сервис `updater`, который **не входит** в набор
пересоздаваемых (`up -d backend admin`) и переживает рестарт. Он держит
`docker.sock` (≈root на хосте), но выполняет **ровно одно фиксированное
действие** без параметров от приложения — инъекция команд невозможна. IPC —
файлы в общем volume `updater_ipc`: backend пишет только `trigger`; `updater`
пишет `status`/`log` (их backend только читает) → нет конфликта владельца между
контейнерами. `updater` при старте `chown 1000:1000 /ipc`, чтобы backend (uid
node) мог создать триггер в root-овом volume.

## Развёртывание у клиента

```bash
# 1. Получить compose + .env (один раз)
mkdir -p /opt/curier/docker && cd /opt/curier/docker
# положить docker-compose.prod.yml и .env (по docs/DEPLOYMENT.md)
# 2. Запуск / обновление
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Дальше обновления — кнопкой в админке. `docker-compose.yml` (сборка из
исходников) остаётся для локальной разработки; прод использует
`docker-compose.prod.yml` (готовые образы).

## Безопасность и оговорки

- Эндпоинт обновления — только admin (JWT + RolesGuard).
- `docker.sock` изолирован в `updater`; действие фиксированное.
- **Бэкап БД перед обновлением** — миграции применяются автоматически, среди них
  могут быть необратимые.
- Во время обновления backend и admin перезапускаются → ~1–2 мин даунтайма,
  страница админки временно недоступна (по дизайну).
- `name: docker` в prod-compose НЕ менять на работающей инсталляции — иначе
  тома (`docker_db_data`) осиротеют.

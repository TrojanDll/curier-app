# App Force-Update — Server-Driven Minimum Version

Защита от рассинхрона «сервер ↔ мобильное приложение»: когда выходит
breaking-фича, затрагивающая и backend, и Android-клиент, старые приложения
**этого конкретного сервера** принудительно блокируются до обновления. Пара к
[app-update.md](app-update.md) (мягкое обновление из GitHub Releases) и
[self-update.md](self-update.md) (обновление серверного стека).

## Политика (Policy B — min-версия, бамп вручную)

- Сервер объявляет **минимально совместимую `versionCode`** приложения.
- Приложение < минимума → **блокирующий** экран без «Позже».
- Приложение ≥ минимума → обычный (мягкий) поток обновления.
- Минимум поднимается **вручную** только когда реально появилась несовместимость
  — не на каждый релиз стека. Тривиальные обновления не дёргают курьеров.

## Источник правды

Константа `DEFAULT_MIN_APP_VERSION_CODE` в
[backend/src/app-client/app-client.controller.ts](../backend/src/app-client/app-client.controller.ts).
Поднимать в том же коммите, что и breaking-изменение, до `versionCode` нужного
APK (`versionCode` = `github.run_number` сборки `release-apk`). Образ, собранный
из этого коммита, сразу отдаёт новый минимум; после обновления стека все клиенты
ниже минимума блокируются. Временный override без пересборки — env
`MIN_APP_VERSION_CODE` (целое > 0).

## Контракт

| Сторона | Где | Что |
|---|---|---|
| Backend | `GET /api/app/min-version` (**public**, без JWT) | `{ minVersionCode: number }` |
| Mobile — DTO/API | `AppMinVersionDto`, `ApiService.getMinAppVersion()` | идёт на настроенный сервер (BASE_URL), не на GitHub |
| Mobile — repo | `AppUpdateRepository.getServerMinVersionCode()` | 404/недоступен → `null` (не форсим) |
| Mobile — gate | `MainActivity.enforceServerMinVersion()` (в `onStart`) | `VERSION_CODE < min` → `showUpdateDialog(isMandatory=true)` |

Эндпоинт **публичный намеренно**: устаревший клиент должен узнать минимум, даже
если контракт авторизации/API сломан. На каждый `onStart` (без троттлинга, в
отличие от мягкой проверки) — пока не удовлетворён.

## Поведение клиента

1. Сервер не задан / не отвечает / 404 (старый backend) → не блокируем
   (back-compat; работает старый клиент со старым сервером).
2. `VERSION_CODE < minVersionCode` → блокирующий диалог (не закрыть, нет «Позже»).
   APK берётся из GitHub Releases (как и мягкий апдейт).
3. GitHub недоступен в момент блокировки → диалог «Требуется обновление» с
   «Повторить» — дальше всё равно не пройти.

## Как выпустить breaking-изменение

1. Реализовать фичу в backend/admin + mobile.
2. Поднять `DEFAULT_MIN_APP_VERSION_CODE` до `versionCode` будущего APK.
3. Запушить `android/**` → `release-apk` соберёт APK с этим `versionCode`.
4. Запушить `backend/**` → `release-stack` соберёт образ с новым минимумом.
5. Клиент обновляет стек («Обновления сервера») → старые приложения блокируются →
   курьеры жмут «Обновить» → ставят новый APK.

> Порядок: APK должен быть опубликован (шаг 3) **до/вместе** с поднятием минимума,
> иначе заблокированным клиентам нечего будет скачать (покажется «Повторить»).

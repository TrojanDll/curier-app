# In-App Update — Feature Reference

Механизм обновления Android-приложения «по воздуху»: backend хранит и раздаёт
APK, админка управляет версиями, приложение само проверяет наличие новой версии
и предлагает установить. Публикация автоматизирована через GitHub Actions по
коммиту в `main`.

## Поток в двух словах

```
коммит в main → GitHub Actions собирает подписанный APK
   → POST /api/admin/app-releases (публикация на backend)
   → приложение при старте: GET /api/app/latest
   → versionCode > BuildConfig.VERSION_CODE? → диалог → скачать → установить
```

## Backend (`backend/src/app-releases/`)

Модуль `AppReleasesModule`. Таблица `app_releases` (миграция
`20260529120000_add_app_releases`): `version_code` (unique), `version_name`,
`release_notes?`, `file_path`, `file_size`, `sha256`, `is_mandatory`,
`git_commit?`, `created_at`. Файлы APK лежат в `APK_UPLOAD_DIR`
(`./uploads/apk` → внутри тома `uploads`).

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/app/latest` | **public** | Метаданные последней версии. 204, если релизов нет. |
| GET | `/api/app/download/:versionCode` | **public** | Отдаёт APK (`application/vnd.android.package-archive`). |
| GET | `/api/admin/app-releases` | admin | Список версий (новые сверху). |
| POST | `/api/admin/app-releases` | admin | Загрузка APK (multipart `apk` + поля versionCode/versionName/releaseNotes/isMandatory/gitCommit). |
| DELETE | `/api/admin/app-releases/:id` | admin | Удалить версию + файл. |

`latest`/`download` намеренно публичные (без JWT) — приложение проверяет
обновление до логина, а APK не секрет. Загрузка считает SHA-256, проверяет
ZIP-сигнатуру APK и размер (`APK_MAX_SIZE_MB`, default 200). versionCode
уникален — повторная загрузка той же версии → 400.

env: `APK_UPLOAD_DIR`, `APK_MAX_SIZE_MB` (см. `backend/.env.example`).

## Admin (`admin/src/app/(authenticated)/app-updates/`)

Пункт меню «Обновления». Форма загрузки нового APK (файл + versionCode +
versionName + «что нового» + флаг «обязательное») и таблица опубликованных
версий с пометкой «Текущая» (наибольший versionCode) и кнопкой удаления.
Хуки — `admin/src/lib/api/releases.ts` (`useAppReleases`,
`useUploadAppRelease`, `useDeleteAppRelease`). Загрузка идёт через BFF-прокси
как `FormData` (он бинарно-безопасен), `timeout: 0` для крупных файлов.

## Android (`core/util/UpdateManager.kt`, `MainActivity.checkForUpdates`)

При старте `MainActivity` (если сервер настроен) дёргает `GET /api/app/latest`
через `AppUpdateRepository`. Если `versionCode > BuildConfig.VERSION_CODE` —
`MaterialAlertDialogBuilder` с release notes. По «Обновить» `UpdateManager`
качает APK системным `DownloadManager` в `getExternalFilesDir(DOWNLOADS)` и по
завершении запускает установщик через `FileProvider`
(`${applicationId}.fileprovider`, paths в `res/xml/file_paths.xml`).

Манифест: `REQUEST_INSTALL_PACKAGES` + `<provider>` FileProvider. На Android 8+
при первой установке пользователь подтверждает «установка из этого источника»
(`canRequestPackageInstalls` → `ACTION_MANAGE_UNKNOWN_APP_SOURCES`). Флаг
`isMandatory` делает диалог непропускаемым (`setCancelable(false)`).

DTO/слой: `AppVersionDto` → `AppUpdateInfo` (`data/mapper/AppVersionMapper.kt`),
`AppUpdateRepository(+Impl)`, регистрация в `RepositoryModule`.

## CI (`.github/workflows/release-apk.yml`)

Триггер: push в `main` (paths `android/**`) или ручной `workflow_dispatch`.
Шаги: checkout → JDK 17 → Android SDK → декод keystore из secret → `gradlew
assembleRelease -PappVersionCode=<run_number> -PappVersionName=1.0.<run_number>`
→ логин админом → `POST /api/admin/app-releases` с APK.

`versionCode = github.run_number` — монотонно растёт, поэтому каждый прогон
даёт версию выше. `build.gradle.kts` читает `appVersionCode`/`appVersionName`
из `-P` свойств (fallback 1 / "1.0.0" для локальных debug-сборок).

### Что нужно настроить один раз (вручную)

1. **Создать keystore** (если ещё нет) — см. `docs/android-release-build.md`
   (`keytool -genkeypair … release.jks`). Бэкапнуть в 2 места.
2. **Создать GitHub-репозиторий** и запушить проект (`git remote add origin …`
   + `git push -u origin main`). Сейчас remote нет — без него Actions не
   запустится.
3. **Secrets** (Settings → Secrets and variables → Actions):
   - `KEYSTORE_BASE64` = `base64 -w0 android/release.jks`
   - `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
   - `BACKEND_URL` = `http://109.73.203.142:8081`
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`
4. Готово: следующий коммит в `main` (затрагивающий `android/**`) соберёт и
   опубликует APK; курьеры увидят обновление при следующем запуске.

> Альтернатива без CI: загрузить APK вручную через админку
> (страница «Обновления» → «Загрузить версию»). Это работает независимо от
> GitHub Actions.

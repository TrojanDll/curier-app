# In-App Update (Android) — Feature Reference

Два независимых потока по коммиту в `main`:

1. **Обновление Android-приложения** «по воздуху» из **GitHub Releases**
   open-source репозитория. Полностью автоматический, **тема этого документа**.
2. **Деплой серверного стека** (backend + admin) — **pull-модель** через GHCR:
   CI публикует образы, оператор применяет обновление кнопкой в админке. CI ни
   к одному серверу не подключается. Полное описание — **`docs/self-update.md`**;
   ниже только краткая ветка для контраста с APK-потоком.

## Поток в двух словах

```
коммит в main
  ├─ изменения в android/**  → workflow «Release APK» (release-apk.yml)
  │     собирает подписанный APK → создаёт GitHub Release
  │     (tag v1.0.<run>, asset curier-<run>.apk, make_latest)
  │        ↓
  │     приложение при старте: GET api.github.com/repos/<owner>/<repo>/releases/latest
  │        versionCode (из имени ассета) > BuildConfig.VERSION_CODE? → диалог → скачать → установить
  │
  └─ изменения в backend/** | admin/** | docker/** → workflow «Release stack» (release-stack.yml)
        build+push образов в GHCR (:1.0.N + :latest) + prerelease stack-v1.0.N
           ↓
        деплой НЕ автоматический: оператор в админке «Обновления сервера» →
        sidecar `updater` делает docker compose pull && up -d backend admin →
        backend стартует, prisma migrate deploy.   (подробности: self-update.md)
```

## Android (`core/util/UpdateManager.kt`, `MainActivity.checkForUpdates`)

`MainActivity.onStart` (т.е. при каждом выходе приложения на передний план, а
не только при холодном старте — приложение single-Activity) дёргает GitHub
Releases через `AppUpdateRepository` → `GithubApiService`
(`GET repos/TrojanDll/curier-app/releases/latest`), независимо от настройки
сервера. **Троттлинг:** `checkForUpdatesThrottled()` проверяет не чаще раза в
`UPDATE_CHECK_MIN_INTERVAL_MS` (6 ч); время последней УСПЕШНОЙ проверки лежит в
SharedPreferences `app_update_prefs`, ошибки окно не «съедают» (повтор при
следующем возврате). Это защищает от лимита анонимного GitHub API (60 req/ч/IP)
и убирает повторные запросы при пересоздании Activity (поворот экрана). Отдельный Retrofit-клиент
в `NetworkModule.provideGithubApiService()` — baseUrl `https://api.github.com/`,
**без** JWT-интерсептора (чужой Bearer GitHub отверг бы 401).

`GithubReleaseMapper.toAppUpdateInfo()` берёт первый asset, имя которого
матчит `curier-(\d+)\.apk`, и достаёт из него `versionCode`; `versionName` —
тег без префикса `v`; `downloadUrl` — `browser_download_url` ассета (абсолютный,
публичный). Если APK-ассета нет или релизов нет (404) → «обновлять нечего».

Если `versionCode > BuildConfig.VERSION_CODE` — `MaterialAlertDialogBuilder`
с release notes (тело релиза). По «Обновить» `UpdateManager` качает APK
системным `DownloadManager` в `getExternalFilesDir(DOWNLOADS)` и по завершении
запускает установщик через `FileProvider` (`${applicationId}.fileprovider`,
paths в `res/xml/file_paths.xml`).

Манифест: `REQUEST_INSTALL_PACKAGES` + `<provider>` FileProvider. На Android 8+
при первой установке пользователь подтверждает «установка из этого источника»
(`canRequestPackageInstalls` → `ACTION_MANAGE_UNKNOWN_APP_SOURCES`).

Слой: `GithubReleaseDto`/`GithubAssetDto` (`data/remote/dto`),
`GithubApiService` (`data/remote/api`), `GithubReleaseMapper`,
`AppUpdateRepository(+Impl)`, регистрация в `RepositoryModule`.

> **`isMandatory` всегда false** в GitHub-потоке: у релиза нет флага
> обязательности. При необходимости можно завести конвенцию (метка в теле
> релиза) и расширить маппер.

## CI — Release APK (`.github/workflows/release-apk.yml`)

Триггер: push в `main` (paths `android/**`) или `workflow_dispatch`.
Шаги: checkout → JDK 17 → Android SDK → декод keystore из secret → `gradlew
assembleRelease -PappVersionCode=<run_number> -PappVersionName=1.0.<run_number>`
→ `softprops/action-gh-release` публикует Release с тегом `v1.0.<run_number>`
и ассетом `curier-<run_number>.apk`. `permissions: contents: write`.

`versionCode = github.run_number` — монотонно растёт. `build.gradle.kts`
читает `appVersionCode`/`appVersionName` из `-P` свойств (fallback 1 / "1.0.0").

## CI — Release stack (`.github/workflows/release-stack.yml`)

Триггер: push в `main` (paths `backend/**`, `admin/**`, `docker/**`,
`.github/workflows/release-stack.yml`) или `workflow_dispatch`. Собирает и
**пушит публичные образы в GHCR** (`curier-backend`, `-admin`, `-updater`;
теги `1.0.<run>` + `latest`) и публикует prerelease `stack-v1.0.<run>`.
**CI ни к одному серверу не подключается** (раньше была rsync/SSH push-модель —
больше не используется). Деплой — pull-модель: оператор жмёт «Обновить» в
админке («Обновления сервера»), backend пишет триггер в volume `updater_ipc`,
sidecar `updater` выполняет `docker compose pull && up -d backend admin`;
backend при старте применяет `prisma migrate deploy`.

Полное описание (API `/api/admin/system/*`, updater-сайдкар, IPC, GHCR public,
безопасность) — **`docs/self-update.md`**.

## Что нужно настроить один раз

### Secrets (Settings → Secrets and variables → Actions)

Нужны только для подписи APK (`release-apk.yml`). Деплой стека
(`release-stack.yml`) дополнительных секретов не требует — публикация в GHCR
идёт через автоматический `secrets.GITHUB_TOKEN`; GHCR-пакеты нужно один раз
сделать публичными (см. `docs/self-update.md`).

| Secret | Назначение |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w0 android/release.keystore` |
| `KEYSTORE_PASSWORD` | пароль keystore |
| `KEY_ALIAS` | алиас ключа |
| `KEY_PASSWORD` | пароль ключа |

### Прочее

1. **Keystore** уже есть (`android/release.keystore` + `keystore.properties`,
   оба gitignored) — см. `docs/android-release-build.md`. Бэкапнуть в 2 места.
2. **Подписи должны совпадать.** Android обновляет APK только если новый
   подписан тем же ключом, что и установленный. Старые установки, подписанные
   **debug**-ключом, обновиться поверх release-подписи НЕ смогут — их нужно один
   раз переустановить (удалить debug-версию, поставить release из GitHub Release).
3. Готово: коммит в `main` соберёт и опубликует APK автоматически. Серверный
   стек **не** деплоится автоматически — образы публикуются в GHCR, а
   обновление применяется вручную из админки (см. `docs/self-update.md`).

> Релизы можно делать и вручную: вкладка **Releases** репозитория → создать
> релиз с тегом `v1.0.<N>` и приложить ассет `curier-<N>.apk`. Приложение его
> подхватит так же, как сборку из CI.

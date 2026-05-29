# In-App Update & Deploy — Feature Reference

Два независимых, полностью автоматических потока по коммиту в `main`:

1. **Обновление Android-приложения** «по воздуху» из **GitHub Releases**
   open-source репозитория. Backend/админка в раздаче APK НЕ участвуют.
2. **Деплой серверного стека** (backend + admin) на VPS — оба сервиса
   пересобираются вместе, поэтому всегда обновляются согласованно.

## Поток в двух словах

```
коммит в main
  ├─ изменения в android/**  → workflow «Release APK»
  │     собирает подписанный APK → создаёт GitHub Release
  │     (tag v1.0.<run>, asset curier-<run>.apk)
  │        ↓
  │     приложение при старте: GET api.github.com/repos/<owner>/<repo>/releases/latest
  │        versionCode (из имени ассета) > BuildConfig.VERSION_CODE? → диалог → скачать → установить
  │
  └─ изменения в backend/** | admin/** | docker/** → workflow «Deploy backend + admin»
        rsync кода на VPS → docker compose up -d --build backend admin
        (Prisma-миграции применяются сами при старте backend)
```

## Android (`core/util/UpdateManager.kt`, `MainActivity.checkForUpdates`)

При старте `MainActivity` всегда (независимо от настройки сервера) дёргает
GitHub Releases через `AppUpdateRepository` → `GithubApiService`
(`GET repos/TrojanDll/curier-app/releases/latest`). Отдельный Retrofit-клиент
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

## CI — Deploy backend + admin (`.github/workflows/deploy.yml`)

Триггер: push в `main` (paths `backend/**`, `admin/**`, `docker/**`) или
`workflow_dispatch`. SSH-ключом деплоя: `rsync` кода в `/opt/curier/{backend,admin,docker}`
(исключая `node_modules/.next/dist/build/uploads/.env` — реальные секреты и тома
на проде защищены, `--delete` их не трогает), затем по SSH
`docker compose up -d --build backend admin`. `db` не пересоздаётся (том цел),
Prisma-миграции применяются при старте backend (`CMD = prisma migrate deploy`).

## Что нужно настроить один раз

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Назначение |
|---|---|
| `KEYSTORE_BASE64` | `base64 -w0 android/release.keystore` |
| `KEYSTORE_PASSWORD` | пароль keystore |
| `KEY_ALIAS` | алиас ключа |
| `KEY_PASSWORD` | пароль ключа |
| `VPS_HOST` | IP/host VPS (напр. `109.73.203.142`) |
| `VPS_USER` | пользователь SSH (напр. `root`) |
| `VPS_SSH_KEY` | приватный SSH-ключ с доступом на VPS |

### Прочее

1. **Keystore** уже есть (`android/release.keystore` + `keystore.properties`,
   оба gitignored) — см. `docs/android-release-build.md`. Бэкапнуть в 2 места.
2. **Подписи должны совпадать.** Android обновляет APK только если новый
   подписан тем же ключом, что и установленный. Старые установки, подписанные
   **debug**-ключом, обновиться поверх release-подписи НЕ смогут — их нужно один
   раз переустановить (удалить debug-версию, поставить release из GitHub Release).
3. Готово: коммит в `main` соберёт и опубликует APK / задеплоит сервер
   автоматически.

> Релизы можно делать и вручную: вкладка **Releases** репозитория → создать
> релиз с тегом `v1.0.<N>` и приложить ассет `curier-<N>.apk`. Приложение его
> подхватит так же, как сборку из CI.

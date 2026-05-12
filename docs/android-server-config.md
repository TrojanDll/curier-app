# Android — Server Config (Runtime BASE_URL)

`BASE_URL` is no longer baked into product flavors. It is supplied at
runtime through `ServerConfigManager`, prompted at first launch and
editable from Profile, so a single APK works against any self-hosted
backend.

## Storage

| Key       | Type   | Location                                                              |
| --------- | ------ | --------------------------------------------------------------------- |
| base_url  | String | `EncryptedSharedPreferences` (`curier_server_config_secure`)          |
| base_url  | String | `SharedPreferences` (`curier_server_config`) — fallback on crypto err |

`ServerConfigManager.saveBaseUrl(url)` normalizes the input (`trim` +
trailing `/`). `getBaseUrl()` returns `null` if blank.

## Wiring

- `CurierApplication.onCreate()` → `NetworkModule.initialize(context)`
  creates both `TokenManager` and `ServerConfigManager` singletons.
- `NetworkModule.provideRetrofit()` reads the URL lazily on every call:
  - rebuilds `Retrofit` when the URL changes (compared against `cachedBaseUrl`).
  - resets `apiService` so the next `provideApiService()` call returns
    a Retrofit-backed instance with the new URL.
- Empty URL → `http://0.0.0.0/` placeholder. Retrofit builds, network
  calls fail with `ConnectException`. Used only until the user hits the
  Server-Connection screen (§7.2).

## Reset flow (used after URL change)

```kotlin
NetworkModule.provideServerConfigManager().saveBaseUrl(newUrl)
NetworkModule.resetClients()       // drop OkHttpClient + Retrofit + ApiService
RepositoryModule.resetCache()      // drop repositories holding old ApiService
```

Order matters — repositories capture an `ApiService` instance via their
constructor, so they must be evicted after the network stack is reset.

## Build / network config

- `android/app/build.gradle.kts` — no `flavorDimensions`, no
  `productFlavors`, no `BuildConfig.BASE_URL`. Build with the standard
  `./gradlew assembleDebug` (the old `assembleEmulatorDebug` task is
  gone).
- `network_security_config.xml` — widened to
  `<base-config cleartextTrafficPermitted="true" />`. Backend on a
  LAN typically uses HTTP. Release-time override (§7.9) will narrow
  this back.

## Server-connection screen (§7.2)

`serverConfigFragment` is the nav-graph **start destination**. On
launch:

1. `ServerConfigViewModel` reads `serverConfigManager.getBaseUrl()` in
   `init { }`.
   - URL present → `isConnected = true` → fragment immediately
     `navigate(R.id.action_serverConfig_to_login)`
     (`popUpTo` is `serverConfigFragment` / inclusive).
   - URL absent → render the form.
2. Form input → `onUrlChanged` (clears errors).
3. Connect button → `onConnectClicked`:
   - validates scheme (`http://` / `https://`) + host (`Uri.parse`),
   - runs `ServerHealthChecker.check(url)` — a standalone OkHttp
     `GET <url>/health` with 5s connect+read timeouts. Health endpoint
     lives outside `/api` (see `docs/observability.md`).
   - on success: `saveBaseUrl` → `NetworkModule.resetClients()` →
     `RepositoryModule.resetCache()` → emit `isConnected = true` →
     fragment navigates.
   - on failure: `generalError` populated, button re-enabled.

`ServerHealthChecker` deliberately does **not** use `NetworkModule` —
the probe must not pollute the global Retrofit/OkHttp cache before the
user confirms the URL.

## Change-server flow (§7.3)

Profile screen → "Сменить сервер" button (`btnChangeServer`):

1. `MaterialAlertDialog` confirmation.
2. `ProfileViewModel.changeServer()`:
   - best-effort `authRepository.logout()` (network failures swallowed
     with `runCatching`),
   - `serverConfigManager.clearBaseUrl()`,
   - `NetworkModule.resetClients()` + `RepositoryModule.resetCache()`,
   - emit `changeServerSuccess = true`.
3. `ProfileFragment` resolves the root NavController (via
   `nav_host_fragment → childFragmentManager.fragments[0]`) and
   navigates `action_main_to_serverConfig` (`popUpTo` is the nav-graph,
   inclusive).

Logout flow stays unchanged — it routes through `action_main_to_login`,
not the server-config screen.

## Files

| File                                                                                            | Role                              |
| ----------------------------------------------------------------------------------------------- | --------------------------------- |
| `android/app/src/main/java/com/example/curier_mobile/data/local/preferences/ServerConfigManager.kt` | Singleton, EncryptedSharedPrefs   |
| `android/app/src/main/java/com/example/curier_mobile/data/remote/health/ServerHealthChecker.kt`     | Standalone OkHttp `/health` probe |
| `android/app/src/main/java/com/example/curier_mobile/presentation/serverconfig/ServerConfigFragment.kt` | First-launch URL screen         |
| `android/app/src/main/java/com/example/curier_mobile/presentation/serverconfig/ServerConfigViewModel.kt` | Validation + health-check + save |
| `android/app/src/main/java/com/example/curier_mobile/presentation/serverconfig/ServerConfigUiState.kt`  | UI state                         |
| `android/app/src/main/res/layout/fragment_server_config.xml`                                       | Screen layout                    |
| `android/app/src/main/res/navigation/nav_graph.xml`                                                | `serverConfigFragment` startDest |
| `android/app/src/main/java/com/example/curier_mobile/core/di/NetworkModule.kt`                  | Lazy Retrofit + reset method      |
| `android/app/src/main/java/com/example/curier_mobile/core/di/RepositoryModule.kt`               | `resetCache()` for repo singletons |
| `android/app/src/main/res/xml/network_security_config.xml`                                      | Permits cleartext for any host    |

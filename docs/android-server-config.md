# Android — Server Config (Runtime BASE_URL)

`BASE_URL` is no longer baked into product flavors. It is supplied at
runtime through `ServerConfigManager` so a single APK works against any
self-hosted backend.

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

## Files

| File                                                                                            | Role                              |
| ----------------------------------------------------------------------------------------------- | --------------------------------- |
| `android/app/src/main/java/com/example/curier_mobile/data/local/preferences/ServerConfigManager.kt` | Singleton, EncryptedSharedPrefs   |
| `android/app/src/main/java/com/example/curier_mobile/core/di/NetworkModule.kt`                  | Lazy Retrofit + reset method      |
| `android/app/src/main/java/com/example/curier_mobile/core/di/RepositoryModule.kt`               | `resetCache()` for repo singletons |
| `android/app/src/main/res/xml/network_security_config.xml`                                      | Permits cleartext for any host    |

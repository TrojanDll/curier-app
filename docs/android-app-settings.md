# Android App Settings — Profile Info Card

Stage 4.x / §7.8. Read-only courier view of `GET /api/courier/settings`.
Surfaces photo TTL + support contact on the Profile screen.

## Surface

```
android/app/src/main/java/com/example/curier_mobile/
├── data/
│   ├── remote/
│   │   ├── api/ApiService.kt              # + getAppSettings()
│   │   └── dto/AppSettingsDto.kt          # { photoTtlDays, supportContact }
│   ├── repository/AppSettingsRepositoryImpl.kt
│   └── mapper/AppSettingsMapper.kt        # DTO → domain (blank → null)
├── domain/
│   ├── model/AppSettings.kt               # { photoTtlDays, supportContact }
│   └── repository/AppSettingsRepository.kt
├── core/di/RepositoryModule.kt            # provideAppSettingsRepository()
└── presentation/profile/
    ├── ProfileUiState.kt                  # + appSettings: AppSettings?
    ├── ProfileViewModel.kt                # + loadAppSettings()
    └── ProfileFragment.kt                 # binds info card
```

Layout: `res/layout/fragment_profile.xml` → `cardAppInfo` between
`cardStatistics` and `btnLogout`.

## Endpoint

`GET /api/courier/settings` → `{ photoTtlDays: Int, supportContact:
String? }`. Backend contract in `docs/settings.md` → `PublicAppSettingsView`.
JWT-gated, role `courier`. Admins call `/admin/settings` instead.

## Data flow

`ApiService.getAppSettings()` → `AppSettingsRepositoryImpl.getSettings()`
→ `AppSettingsDto.toDomainModel()` → `Result<AppSettings>` →
`ProfileViewModel.loadAppSettings()` writes to `ProfileUiState.appSettings`.

The mapper trims `supportContact` and collapses blank → null at the
boundary, so the UI's null-check covers both "field unset on server"
and "field is whitespace" without an extra guard.

## ViewModel lifecycle

| Trigger | Effect |
|---|---|
| `init { }` | Calls `loadAppSettings()` alongside profile + stats. |
| Pull-to-refresh | `refreshProfile()` re-fetches profile, stats, and settings together. |
| Network / HTTP error | Logged via `Result.Error`, swallowed silently — info card just shows the fallback text. |

Errors are intentionally not surfaced. The card is informational; a
network blip on this one endpoint shouldn't blank the user's profile
with a Snackbar.

## DI / lifecycle quirks

- `RepositoryModule.provideAppSettingsRepository()` mirrors the other
  repos: lazy singleton, recreated on `resetCache()` (called from the
  change-server flow so the next courier on a different BASE_URL gets
  a fresh repo against the new Retrofit instance).
- `ViewModelFactory` injects the repo into `ProfileViewModel` only —
  no other VM consumes it yet. If a future screen needs settings,
  share the singleton via the same factory branch.

## UI behaviour

`fragment_profile.xml` → `cardAppInfo` (MaterialCardView):

| Block | Source | Fallback when `appSettings == null` |
|---|---|---|
| Photo TTL value | `getString(R.string.photo_ttl_value_format, photoTtlDays)` | `R.string.photo_ttl_unknown` ("Срок хранения фото уточните у администратора") |
| Photo TTL hint | static `R.string.photo_ttl_hint` | same |
| Support contact | `appSettings.supportContact` | `R.string.support_contact_fallback` ("По вопросам работы с приложением свяжитесь с администратором…") |

`tvSupportContact` uses `android:autoLink="phone|email|web"`. Admins who
type a phone, email, or URL get tappable links without per-pattern
parsing on the Kotlin side. Free-form text (e.g. "Иван Петров,
+7 999 …, @support_bot") shows the phone as a dialable link.

## Strings

| Resource | Used for |
|---|---|
| `app_info_title` | Card heading |
| `photo_ttl_section_title` | "Хранение фото" label |
| `photo_ttl_value_format` | `Фото доставок хранятся %d дн.` |
| `photo_ttl_hint` | Sub-line under the TTL value |
| `photo_ttl_unknown` | Fallback when settings load failed / not yet loaded |
| `support_section_title` | "Поддержка" label |
| `support_contact_fallback` | Fallback when admin hasn't configured the contact |

## What is NOT here

- **No cache / persistence.** Settings are tiny and the screen is
  rarely open; an extra DB roundtrip would just be churn. If we need
  offline support, mirror the `UserDao` pattern.
- **No realtime updates.** Admin edits land on the next courier
  Profile open / pull-to-refresh. Adding a `settings:updated` event
  on the realtime gateway is straightforward if it ever matters.
- **No write path.** Courier role has read-only access by design —
  only admins mutate `app_settings`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
./gradlew assembleEmulatorDebug     # Debug APK for emulator
./gradlew assemblePhysicalDebug     # Debug APK for physical device
./gradlew installEmulatorDebug      # Install on emulator
./gradlew installPhysicalDebug      # Install on physical device
./gradlew test                      # Unit tests
./gradlew lintDebug                 # Lint checks
./gradlew clean                     # Clean build
```

**Product flavors** control `BASE_URL` via `BuildConfig`:
- `emulator` → `http://10.0.2.2:8081/` (Android emulator magic IP)
- `physical` → `http://10.49.230.177:8081/` (local WiFi IP)

Always specify a flavor when building: `assembleEmulatorDebug`, not `assembleDebug`.

## Architecture

**Clean Architecture + MVVM** with three layers:

```
Presentation (Fragments + ViewModels + UiState)
    ↓
Domain (Repository interfaces + Models)
    ↓
Data (Repository impls + Retrofit API + Room DB + Mappers)
```

### Presentation Layer (`presentation/`)
- **Fragments** observe `StateFlow<UiState>` from ViewModels
- **BaseFragment** provides ViewBinding lifecycle management
- **BaseViewModel** provides common error handling
- **ViewModelFactory** creates ViewModels with dependencies (custom factory, not Hilt)
- Each feature has its own `UiState` sealed/data class

### Domain Layer (`domain/`)
- **Repository interfaces**: `AuthRepository`, `OrderRepository`, `ProfileRepository`
- **Models**: `Order` (with `OrderStatus` enum), `User`, `Statistics`
- **Result<T>** sealed class: `Success`, `Error`, `Loading`

### Data Layer (`data/`)
- **Retrofit + Moshi** for networking (`ApiService.kt` defines all endpoints)
- **AuthInterceptor** injects JWT Bearer token (skips `/auth/login` and `/auth/refresh`)
- **TokenManager** stores tokens in `EncryptedSharedPreferences` (with fallback to regular prefs)
- **Room** database caches orders/users (`AppDatabase`, version 2, destructive migration)
- **Mapper functions** convert between DTO ↔ Domain ↔ Entity (extension functions like `OrderDto.toDomainModel()`)

### Dependency Injection (`core/di/`)
- **Manual singleton DI** — Hilt is disabled due to Kotlin 2.0.21 compatibility
- `NetworkModule`, `DatabaseModule`, `RepositoryModule` — initialized in `CurierApplication.onCreate()`
- All use lazy initialization with thread-safe synchronization

### Navigation
- Two-level nav: main graph (`nav_graph.xml`) + nested graph (`nav_graph_main.xml`)
- `MainFragment` hosts `BottomNavigationView` with 3 tabs: Orders, History, Profile
- Safe Args plugin for type-safe navigation arguments

### Order Status Flow
```
assigned → picked_up → near_customer → delivered → returned
```
Validated via `OrderStatus.isValidTransition()` before API calls.

## Backend (`backend/`)

Node.js/Express server on port 8081. **In-memory database** (no persistence, dev only).

```bash
cd backend && npm start    # Start server
```

Key routes: `/api/auth/*` (register/login/logout/refresh), `/api/courier/orders/*`, `/api/courier/profile`, `/api/courier/statistics`

## Key Conventions

- **Language**: User communication in Russian; code comments bilingual; documentation files in English
- **Dependencies**: Managed via `gradle/libs.versions.toml` version catalog
- **ViewBinding** enabled (no `findViewById`)
- **Coroutines + Flow** for async operations throughout
- **KSP** (not kapt) for annotation processing (Room, Moshi codegen)
- Comprehensive project documentation lives in `/Documentation/`

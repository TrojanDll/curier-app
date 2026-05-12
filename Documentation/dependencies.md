# Dependencies

> **⚠️ Этот документ описывает зависимости v1 (только Android-клиент) и
> сохранён как исторический артефакт. Актуальные зависимости в v2:**
>
> | Слой | Где смотреть |
> |---|---|
> | Android | `android/gradle/libs.versions.toml` (version catalog), `android/app/build.gradle.kts` |
> | Backend | `backend/package.json` + `backend/prisma/schema.prisma` |
> | Admin | `admin/package.json` + `admin/next.config.ts` |
> | Зафиксированные технологические решения | [`Documentation/completion_plan.md`](completion_plan.md) §15 «Решения по технологическому стеку», §16 «Open-вопросы и решения» |
> | Production-стек Docker (точные образы) | [`docs/docker-stack.md`](../docs/docker-stack.md) |
>
> Ниже — оригинальный v1-документ. Версии и набор зависимостей **не
> отражают v2-реальность** (нет упоминаний NestJS, Prisma, Next.js,
> Socket.IO, Coil, Room и т. д.). Используйте этот файл только как
> исторический контекст.

## Document Information
- **Project**: Curier Mobile Application
- **Version**: 1.0
- **Date Created**: 2025-11-04
- **Last Updated**: 2025-11-04
- **Status**: Approved (для v1 — суперседед v2-источниками выше)

## 1. Current Dependencies (From gradle/libs.versions.toml)

| Library | Current Version | Purpose | Status | Notes |
|---------|----------------|---------|--------|-------|
| AndroidX Core KTX | 1.17.0 | Core Kotlin extensions | ✓ Current | Latest stable |
| AndroidX AppCompat | 1.7.1 | Backward compatibility | ✓ Current | Latest stable |
| Material Design | 1.13.0 | UI components | ✓ Current | Latest stable |
| ConstraintLayout | 2.2.1 | Layout management | ✓ Current | Latest stable |
| JUnit | 4.13.2 | Unit testing | ✓ Current | Industry standard |
| AndroidX JUnit | 1.3.0 | Android unit testing | ✓ Current | Latest stable |
| Espresso | 3.7.0 | UI testing | ✓ Current | Latest stable |

## 2. Required Additional Dependencies

### 2.1 Dependency Injection

#### Hilt (Recommended)
| Component | Version | Purpose |
|-----------|---------|---------|
| hilt-android | 2.51 | Dependency injection runtime |
| hilt-android-compiler | 2.51 | DI code generation |
| hilt-navigation-fragment | 1.2.0 | Navigation integration |

**Why Hilt:**
- Official Google recommendation for Android
- Compile-time validation
- Excellent Jetpack integration
- Reduces boilerplate
- Standard in modern Android development

**Alternative:** Koin 3.5+ (simpler, pure Kotlin, no code generation)

### 2.2 Network Dependencies

#### Retrofit & OkHttp
| Component | Version | Purpose |
|-----------|---------|---------|
| retrofit | 2.9.0 | Type-safe HTTP client |
| retrofit-converter-moshi | 2.9.0 | JSON conversion |
| okhttp | 4.12.0 | HTTP client |
| okhttp-logging-interceptor | 4.12.0 | Network logging |

**Why Retrofit:**
- Industry standard for Android networking
- Type-safe API definitions
- Coroutines support out of the box
- Easy to test with MockWebServer
- Large ecosystem of converters

#### JSON Parsing
| Component | Version | Purpose |
|-----------|---------|---------|
| moshi | 1.15.1 | JSON parsing |
| moshi-kotlin | 1.15.1 | Kotlin support |
| moshi-kotlin-codegen | 1.15.1 | Code generation |

**Why Moshi:**
- Kotlin-first design
- Faster than Gson
- Null-safe by default
- Code generation for performance

**Alternative:** Gson 2.10+ (more established, larger community)

### 2.3 Asynchronous Programming

#### Kotlin Coroutines
| Component | Version | Purpose |
|-----------|---------|---------|
| kotlinx-coroutines-core | 1.8.0 | Coroutines core |
| kotlinx-coroutines-android | 1.8.0 | Android main thread dispatcher |
| kotlinx-coroutines-test | 1.8.0 | Testing utilities |

**Why Coroutines:**
- Official Kotlin async solution
- Built-in Android support
- Cleaner than RxJava for most cases
- Structured concurrency
- Flow for reactive streams

### 2.4 Architecture Components

#### Lifecycle & ViewModel
| Component | Version | Purpose |
|-----------|---------|---------|
| lifecycle-viewmodel-ktx | 2.8.7 | ViewModel with Kotlin extensions |
| lifecycle-livedata-ktx | 2.8.7 | LiveData with Kotlin extensions |
| lifecycle-runtime-ktx | 2.8.7 | Lifecycle-aware components |
| lifecycle-viewmodel-savedstate | 2.8.7 | SavedState support |

**Status:** ✓ Essential for MVVM architecture

#### Navigation Component
| Component | Version | Purpose |
|-----------|---------|---------|
| navigation-fragment-ktx | 2.8.5 | Fragment navigation |
| navigation-ui-ktx | 2.8.5 | UI helpers for navigation |

**Why Navigation Component:**
- Single Activity architecture
- Type-safe navigation
- Deep linking support
- Back stack management
- Animation support

### 2.5 Local Storage

#### Room Database
| Component | Version | Purpose |
|-----------|---------|---------|
| room-runtime | 2.6.1 | SQLite abstraction |
| room-ktx | 2.6.1 | Kotlin extensions & coroutines |
| room-compiler | 2.6.1 | Annotation processor |

**Usage:** Minimal - mainly for caching user preferences and courier profile

#### DataStore
| Component | Version | Purpose |
|-----------|---------|---------|
| datastore-preferences | 1.1.1 | Type-safe preferences |

**Why DataStore:**
- Replaces SharedPreferences
- Asynchronous API
- Type-safe
- Coroutines support
- Handles crashes better

#### Security - Crypto
| Component | Version | Purpose |
|-----------|---------|---------|
| security-crypto | 1.1.0-alpha06 | EncryptedSharedPreferences |

**Purpose:** Secure token storage

### 2.6 Camera

#### CameraX
| Component | Version | Purpose |
|-----------|---------|---------|
| camera-camera2 | 1.4.0 | Camera2 implementation |
| camera-lifecycle | 1.4.0 | Lifecycle integration |
| camera-view | 1.4.0 | Camera preview view |

**Why CameraX:**
- Lifecycle-aware
- Handles device compatibility
- Simpler than Camera2 API
- Consistent behavior across devices
- Google recommendation

### 2.7 Image Loading & Compression

#### Coil (Recommended)
| Component | Version | Purpose |
|-----------|---------|---------|
| coil | 2.7.0 | Image loading library |
| coil-compose | 2.7.0 | Compose support (future) |

**Why Coil:**
- Kotlin-first
- Coroutines support
- Small library size
- Modern API
- Lazy loading

**Alternative:** Glide 4.16+ (more features, larger community)

#### Image Compression
| Component | Version | Purpose |
|-----------|---------|---------|
| compressor | 3.0.1 | Image compression utility |

**Purpose:** Compress photos before upload

### 2.8 Testing Dependencies

#### Unit Testing
| Component | Version | Purpose |
|-----------|---------|---------|
| junit | 4.13.2 | Test framework (already included) |
| mockk | 1.13.12 | Mocking framework for Kotlin |
| truth | 1.4.4 | Fluent assertions |
| turbine | 1.1.0 | Flow testing |
| kotlinx-coroutines-test | 1.8.0 | Coroutines testing |

**Why MockK:**
- Kotlin-first mocking
- Better DSL than Mockito
- Native coroutines support

#### Instrumentation Testing
| Component | Version | Purpose |
|-----------|---------|---------|
| androidx-test-runner | 1.6.2 | Test runner |
| androidx-test-rules | 1.6.1 | Test rules |
| espresso-core | 3.7.0 | UI testing (already included) |
| espresso-contrib | 3.7.0 | Additional matchers |
| hilt-android-testing | 2.51 | Hilt testing support |

#### Network Testing
| Component | Version | Purpose |
|-----------|---------|---------|
| mockwebserver | 4.12.0 | Mock HTTP server |

**Purpose:** Test API interactions without real server

### 2.9 Utilities

#### Timber (Optional)
| Component | Version | Purpose |
|-----------|---------|---------|
| timber | 5.0.1 | Logging utility |

**Why Timber:**
- Better logging than Log
- Tree-based logging
- Automatic tag generation
- Different trees for debug/release

#### LeakCanary (Debug only)
| Component | Version | Purpose |
|-----------|---------|---------|
| leakcanary-android | 2.14 | Memory leak detection |

**Purpose:** Development tool for finding memory leaks

### 2.10 Date/Time

#### Core Library Desugaring
| Component | Version | Purpose |
|-----------|---------|---------|
| desugar_jdk_libs | 2.1.3 | Java 8+ APIs for older Android |

**Purpose:** Use Java Time API on Android < API 26

## 3. Complete libs.versions.toml Configuration

```toml
[versions]
# Current versions
agp = "8.13.0"
kotlin = "2.0.21"
coreKtx = "1.17.0"
appcompat = "1.7.1"
material = "1.13.0"
constraintlayout = "2.2.1"

# Lifecycle & Architecture
lifecycle = "2.8.7"
navigation = "2.8.5"

# Dependency Injection
hilt = "2.51"
hilt-navigation = "1.2.0"

# Network
retrofit = "2.9.0"
okhttp = "4.12.0"
moshi = "1.15.1"

# Asynchronous
coroutines = "1.8.0"

# Local Storage
room = "2.6.1"
datastore = "1.1.1"
security = "1.1.0-alpha06"

# Camera
camerax = "1.4.0"

# Image Loading
coil = "2.7.0"
compressor = "3.0.1"

# Testing
junit = "4.13.2"
junitVersion = "1.3.0"
espressoCore = "3.7.0"
mockk = "1.13.12"
truth = "1.4.4"
turbine = "1.1.0"
mockwebserver = "4.12.0"
testRunner = "1.6.2"
testRules = "1.6.1"

# Utilities
timber = "5.0.1"
leakcanary = "2.14"
desugar = "2.1.3"

[libraries]
# Core Android (existing)
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
androidx-constraintlayout = { group = "androidx.constraintlayout", name = "constraintlayout", version.ref = "constraintlayout" }

# Lifecycle & Architecture
androidx-lifecycle-viewmodel-ktx = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-ktx", version.ref = "lifecycle" }
androidx-lifecycle-livedata-ktx = { group = "androidx.lifecycle", name = "lifecycle-livedata-ktx", version.ref = "lifecycle" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycle" }
androidx-lifecycle-viewmodel-savedstate = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-savedstate", version.ref = "lifecycle" }

# Navigation
androidx-navigation-fragment-ktx = { group = "androidx.navigation", name = "navigation-fragment-ktx", version.ref = "navigation" }
androidx-navigation-ui-ktx = { group = "androidx.navigation", name = "navigation-ui-ktx", version.ref = "navigation" }

# Hilt
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-android-compiler = { group = "com.google.dagger", name = "hilt-android-compiler", version.ref = "hilt" }
hilt-navigation-fragment = { group = "androidx.hilt", name = "hilt-navigation-fragment", version.ref = "hilt-navigation" }

# Network
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-converter-moshi = { group = "com.squareup.retrofit2", name = "converter-moshi", version.ref = "retrofit" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
okhttp-logging-interceptor = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }

# JSON
moshi = { group = "com.squareup.moshi", name = "moshi", version.ref = "moshi" }
moshi-kotlin = { group = "com.squareup.moshi", name = "moshi-kotlin", version.ref = "moshi" }
moshi-kotlin-codegen = { group = "com.squareup.moshi", name = "moshi-kotlin-codegen", version.ref = "moshi" }

# Coroutines
kotlinx-coroutines-core = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-core", version.ref = "coroutines" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }

# Room
androidx-room-runtime = { group = "androidx.room", name = "room-runtime", version.ref = "room" }
androidx-room-ktx = { group = "androidx.room", name = "room-ktx", version.ref = "room" }
androidx-room-compiler = { group = "androidx.room", name = "room-compiler", version.ref = "room" }

# DataStore
androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }

# Security
androidx-security-crypto = { group = "androidx.security", name = "security-crypto", version.ref = "security" }

# CameraX
androidx-camera-camera2 = { group = "androidx.camera", name = "camera-camera2", version.ref = "camerax" }
androidx-camera-lifecycle = { group = "androidx.camera", name = "camera-lifecycle", version.ref = "camerax" }
androidx-camera-view = { group = "androidx.camera", name = "camera-view", version.ref = "camerax" }

# Image Loading
coil = { group = "io.coil-kt", name = "coil", version.ref = "coil" }

# Image Compression
compressor = { group = "id.zelory", name = "compressor", version.ref = "compressor" }

# Testing
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-espresso-contrib = { group = "androidx.test.espresso", name = "espresso-contrib", version.ref = "espressoCore" }
mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }
truth = { group = "com.google.truth", name = "truth", version.ref = "truth" }
turbine = { group = "app.cash.turbine", name = "turbine", version.ref = "turbine" }
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines" }
mockwebserver = { group = "com.squareup.okhttp3", name = "mockwebserver", version.ref = "mockwebserver" }
androidx-test-runner = { group = "androidx.test", name = "runner", version.ref = "testRunner" }
androidx-test-rules = { group = "androidx.test", name = "rules", version.ref = "testRules" }
hilt-android-testing = { group = "com.google.dagger", name = "hilt-android-testing", version.ref = "hilt" }

# Utilities
timber = { group = "com.jakewharton.timber", name = "timber", version.ref = "timber" }
leakcanary-android = { group = "com.squareup.leakcanary", name = "leakcanary-android", version.ref = "leakcanary" }

# Desugaring
desugar-jdk-libs = { group = "com.android.tools", name = "desugar_jdk_libs", version.ref = "desugar" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
hilt-android = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
kotlin-kapt = { id = "org.jetbrains.kotlin.kapt", version.ref = "kotlin" }
kotlin-parcelize = { id = "org.jetbrains.kotlin.plugin.parcelize", version.ref = "kotlin" }
```

## 4. app/build.gradle.kts Updates

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.kotlin.parcelize)
}

android {
    // ... existing configuration ...

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
        isCoreLibraryDesugaringEnabled = true
    }
}

dependencies {
    // Core Android
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)

    // Lifecycle & Architecture
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.livedata.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.savedstate)

    // Navigation
    implementation(libs.androidx.navigation.fragment.ktx)
    implementation(libs.androidx.navigation.ui.ktx)

    // Hilt
    implementation(libs.hilt.android)
    kapt(libs.hilt.android.compiler)
    implementation(libs.hilt.navigation.fragment)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.moshi)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)

    // JSON
    implementation(libs.moshi)
    implementation(libs.moshi.kotlin)
    kapt(libs.moshi.kotlin.codegen)

    // Coroutines
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.coroutines.android)

    // Room
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    kapt(libs.androidx.room.compiler)

    // DataStore
    implementation(libs.androidx.datastore.preferences)

    // Security
    implementation(libs.androidx.security.crypto)

    // CameraX
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)

    // Image Loading
    implementation(libs.coil)

    // Image Compression
    implementation(libs.compressor)

    // Utilities
    implementation(libs.timber)
    debugImplementation(libs.leakcanary.android)

    // Desugaring
    coreLibraryDesugaring(libs.desugar.jdk.libs)

    // Testing
    testImplementation(libs.junit)
    testImplementation(libs.mockk)
    testImplementation(libs.truth)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.mockwebserver)

    // Instrumentation Testing
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.espresso.contrib)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.rules)
    androidTestImplementation(libs.hilt.android.testing)
    kaptAndroidTest(libs.hilt.android.compiler)
}

kapt {
    correctErrorTypes = true
}
```

## 5. Dependency Justification

### 5.1 Network Stack (Retrofit + OkHttp + Moshi)
**Need:** Critical - App requires API communication
**Alternatives Considered:**
- Ktor: Too new, smaller ecosystem
- Volley: Older, less features
**Decision:** Retrofit - Industry standard, proven, great tooling

### 5.2 Dependency Injection (Hilt)
**Need:** High - Improves testability and maintainability
**Alternatives Considered:**
- Koin: Simpler but runtime DI
- Manual DI: Too much boilerplate
**Decision:** Hilt - Compile-time safety, official recommendation

### 5.3 Camera (CameraX)
**Need:** Critical - Required for delivery photos
**Alternatives Considered:**
- Camera2 API: Too complex, device fragmentation issues
- Camera API (deprecated): Deprecated
**Decision:** CameraX - Modern, lifecycle-aware, handles compatibility

### 5.4 Image Loading (Coil)
**Need:** Medium - Improves UX for photo viewing
**Alternatives Considered:**
- Glide: Larger, more features
- Picasso: Older, less maintained
**Decision:** Coil - Kotlin-first, modern, lightweight

### 5.5 Async (Coroutines)
**Need:** Critical - Required for background operations
**Alternatives Considered:**
- RxJava: More complex learning curve
- Callbacks: Callback hell
**Decision:** Coroutines - Official Kotlin solution, cleaner code

## 6. Version Control Strategy

- **Stay Updated**: Review dependencies quarterly
- **Stable Versions Only**: Avoid alpha/beta in production (except security-crypto)
- **Test Upgrades**: Test major version upgrades thoroughly
- **Security Patches**: Apply security updates immediately
- **Changelog Review**: Review changelogs before upgrading

## 7. Dependency Risks

| Dependency | Risk Level | Mitigation |
|------------|-----------|------------|
| security-crypto (alpha) | Medium | Monitor for stable release, extensively test |
| Retrofit | Low | Well-established, active maintenance |
| Hilt | Low | Official Google support |
| CameraX | Low | Google-maintained, stable |
| Moshi | Low | Square-maintained, stable |
| Room | Low | AndroidX, official support |

## 8. License Compliance

All dependencies use permissive licenses compatible with commercial use:
- **Apache 2.0**: Retrofit, OkHttp, Moshi, Room, Hilt, CameraX, Coil, Timber
- **MIT**: Kotlin Coroutines
- **BSD**: Truth

**No GPL dependencies** - Safe for proprietary development

## 9. Build Size Impact

Estimated APK size impact:
- **Base (current)**: ~5 MB
- **With all dependencies**: ~12-15 MB
- **With ProGuard/R8**: ~8-10 MB

Size can be reduced with:
- R8 code shrinking
- Resource shrinking
- App bundles (AAB)
- Removing unused features

## 10. Necessary Updates to Project

### build.gradle.kts (project level)
```kotlin
buildscript {
    dependencies {
        classpath(libs.hilt.android.gradle.plugin) // if needed
    }
}
```

### gradle.properties
```properties
# Enable AndroidX
android.useAndroidX=true
android.nonTransitiveRClass=true

# Kotlin
kotlin.code.style=official

# Gradle
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true

# Kapt
kapt.incremental.apt=true
kapt.use.worker.api=true
```

## 11. Alternative Stacks Considered

### Alternative 1: Minimal Stack (For smaller projects)
- Remove Hilt → Manual DI or Koin
- Remove Room → Only DataStore
- Remove Timber → Standard Log
- **Pros:** Smaller APK, simpler
- **Cons:** More boilerplate, less features

### Alternative 2: Compose Stack (For future)
- Add Jetpack Compose UI instead of XML
- Add Compose Navigation
- Add Compose CameraX
- **Pros:** Modern UI, declarative
- **Cons:** Steeper learning curve, larger APK

### Alternative 3: Reactive Stack
- Add RxJava instead of Coroutines
- Add RxBinding for UI events
- **Pros:** More operators, established patterns
- **Cons:** Complex learning curve, callback hell

**Decision:** Stick with recommended stack - balances modern practices with stability

## 12. Dependency Update Process

1. **Check for updates** monthly using Gradle Version Catalog
2. **Read changelogs** for breaking changes
3. **Update in separate branch**
4. **Run all tests**
5. **Manual QA** on real devices
6. **Merge** if all tests pass
7. **Document** in change_log.md

## 13. Critical Dependencies Timeline

| Dependency | Add in Iteration | Priority |
|------------|------------------|----------|
| Hilt | Iteration 2 | Critical |
| Retrofit + OkHttp | Iteration 3 | Critical |
| Room + DataStore | Iteration 4 | High |
| Navigation | Iteration 2 | Critical |
| CameraX | Iteration 14 | Medium |
| Coil | Iteration 14 | Medium |
| Testing libs | Iteration 16-17 | High |

## 14. Final Notes

- All versions are current as of November 2025
- This stack supports Android 7.0 (API 24) and above
- Total method count within DEX limit (with R8)
- All dependencies actively maintained
- Educational value: Modern Android best practices
- Production-ready configuration

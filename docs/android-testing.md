# Android — Unit Testing Reference

Patterns for `app/src/test/` JVM-only unit tests covering ViewModels
(§14.7.1). Espresso / instrumented coverage is tracked separately under
§14.7.4.

## Toolchain

| Library | Use |
|---|---|
| `junit:junit` | Test runner (JUnit 4) |
| `io.mockk:mockk` | Mocks for repos / managers — works on Kotlin final classes via the bundled agent |
| `com.google.truth:truth` | Fluent assertions (`assertThat(...).isEqualTo(...)`) |
| `app.cash.turbine:turbine` | Flow / StateFlow / SharedFlow assertions |
| `kotlinx-coroutines-test` | `runTest` + `StandardTestDispatcher` for deterministic coroutines |

Defined in `gradle/libs.versions.toml`; wired in `app/build.gradle.kts`
under `testImplementation`.

## Standard ViewModel test skeleton

```kotlin
@ExperimentalCoroutinesApi
class FooViewModelTest {
    private val testDispatcher = StandardTestDispatcher()
    private lateinit var dependency: SomeRepository
    private lateinit var vm: FooViewModel

    @Before fun setUp() {
        Dispatchers.setMain(testDispatcher)
        dependency = mockk(relaxed = true)
        coEvery { dependency.someCall() } returns Result.Success(...)
        vm = FooViewModel(dependency)
    }

    @After fun tearDown() { Dispatchers.resetMain() }

    @Test fun `flow under test`() = runTest(testDispatcher) {
        vm.someAction()
        advanceUntilIdle()
        assertThat(vm.uiState.value.someField).isTrue()
    }
}
```

Key points:
- `Dispatchers.setMain(testDispatcher)` because `viewModelScope` launches on `Main`.
- `runTest(testDispatcher)` propagates the dispatcher into the test body.
- `advanceUntilIdle()` after any `launch{}` so the coroutine actually runs.
- For `SharedFlow` use Turbine's `flow.test { ... }`; for `StateFlow`
  reading `.value` after `advanceUntilIdle()` is enough.

## Mocking realtime / shared flows

`RealtimeManager.events` is a `SharedFlow` — back it with a
`MutableSharedFlow` in the test:

```kotlin
val realtimeFlow = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = 8)
every { realtimeManager.events } returns realtimeFlow
// In the test body: realtimeFlow.emit(RealtimeEvent.OrderAssigned(order))
```

Same trick works for `OrderRepository.getActiveOrdersFlow()` —
`MutableStateFlow(emptyList())`.

## Avoiding Android-stub traps

JVM unit tests run against the stubbed `android.jar` (Robolectric is
not configured). Anything that calls a real Android API throws "Method
… not mocked." Two examples we've already neutralised:

- `androidx.core.net.toUri()` → replaced with `java.net.URI.create()`
  inside `ServerConfigViewModel.validate` (Android `Uri.parse` is a stub).
- `ServerHealthChecker` was a final class; mockk's agent eventually
  loaded it, but the symptom looked identical to the Uri trap. We
  refactored to `interface ServerHealthCheck` (impl `ServerHealthChecker`)
  so the test can supply a plain mockk mock without final-method tricks.

If a future ViewModel needs `Context`, prefer `mockk(relaxed = true)` or
extract whatever it derives from `Context` into a domain-level interface
before testing.

## Current coverage (§14.7.1)

| Test class | # tests | Notes |
|---|---|---|
| `LoginViewModelTest` | 6 | validation + success/error branches |
| `OrdersViewModelTest` | 8 | init flow, refresh, paused banner, realtime |
| `OrderDetailsViewModelTest` | 9 | status transitions, photo upload, realtime filter |
| `ProfileViewModelTest` | 12 | profile + stats + settings + edit / change-server |
| `HistoryViewModelTest` | 6 | load / refresh / date-range propagation |
| `ServerConfigViewModelTest` | 7 | url validation, health-check, persisted state |

Run: `./gradlew testDebugUnitTest` (from `/android`). Report at
`app/build/reports/tests/testDebugUnitTest/index.html`.

## Instrumented / Espresso (§14.7.4)

Espresso lives in `app/src/androidTest/`. Run on an attached emulator or
physical device:

```bash
./gradlew :app:connectedDebugAndroidTest
```

Without a device, `./gradlew :app:compileDebugAndroidTestKotlin` is the
strongest local check — it catches API/resource breakage without needing
hardware.

### Coverage

| Test class | # tests | Notes |
|---|---|---|
| `LoginFragmentInstrumentedTest` | 4 | empty username / empty password / short password / happy launch — all four exercise the offline VM validation path so no backend is required |

### Wiring

- `fragment-testing` is on `debugImplementation` (not `androidTest…`)
  because the runtime piece — `EmptyFragmentActivity` — must ship inside
  the host APK.
- Theme is passed via `themeResId = R.style.Theme_Curier_mobile` so the
  fragment renders against the real app theme.
- `R.id.*` matchers use the existing fragment_login.xml IDs (`etUsername`,
  `etPassword`, `tilUsername`, `tilPassword`, `btnLogin`).

### Expanding coverage later

Add new specs alongside `LoginFragmentInstrumentedTest`. For flows that
exit the fragment via Navigation, wrap with `TestNavHostController` so
the action is observed without booting MainActivity. For flows that talk
to the backend, drop in `MockWebServer` and point `NetworkModule` at
`mockServer.url("/").toString()` via a test-only initializer.

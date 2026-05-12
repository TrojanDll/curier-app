# Android Release Build — Signed APK

Stage 4.6 / §7.9. Wiring for a production-signed APK: keystore plumbing,
R8 minification, ProGuard rules. The actual keystore is generated and
held by the distribution owner — this doc is the procedure.

## Layout

```
/.gitignore                          # ignores keystore.properties + *.jks
/android/keystore.properties.example # committed template
/android/keystore.properties         # gitignored, real secrets live here
/android/release.jks                 # gitignored, the actual signing key
/android/app/build.gradle.kts        # reads keystore.properties + signingConfigs
/android/app/proguard-rules.pro      # keep rules for Moshi codegen, Socket.IO, OkHttp, Coil
```

## One-time keystore generation

Run from `/android/` (any name works, but `release.jks` matches the
template):

```bash
keytool -genkeypair -v \
  -keystore release.jks \
  -alias curier-release \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Курьер, OU=Mobile, O=<your company>, L=<city>, ST=<region>, C=RU"
```

`keytool` will prompt for the keystore password and the key password —
use different values for each, store them somewhere durable (password
manager). 10000-day validity is intentional: Google Play used to enforce
~25-year keys; even off-Play, rotating signing keys later means
re-publishing the APK under a different identity, so over-pick the
validity once.

> The keystore is the single most critical artifact in the project. If
> it leaks, anyone can publish updates impersonating you. If you lose
> it, you cannot ship updates to existing installs — users must
> uninstall and re-install. Back up `release.jks` to at least two
> separate locations (e.g. encrypted USB + 1Password vault).

## Wire it up

Copy the template and fill in real values:

```bash
cp android/keystore.properties.example android/keystore.properties
# Edit android/keystore.properties:
# storeFile=release.jks
# storePassword=<keystore password>
# keyAlias=curier-release
# keyPassword=<key password>
```

`storeFile` is resolved by Gradle via `rootProject.file(...)`. The
**Gradle rootProject is `/android/`**, not the git repo root, so the
path is relative to `/android/`.

Both `android/keystore.properties` and `android/release.jks` are
gitignored. The `.example` file is committed as the template.

## Build commands

From `/android/`:

| Command | Output | Notes |
|---|---|---|
| `./gradlew assembleDebug` | `app/build/outputs/apk/debug/app-debug.apk` | Debug, no minification, debug-signed by the SDK's auto-keystore. |
| `./gradlew assembleRelease` | `app/build/outputs/apk/release/app-release.apk` | R8 minify + shrinkResources + signed with `release.jks`. |
| `./gradlew bundleRelease` | `app/build/outputs/bundle/release/app-release.aab` | AAB for Play (not used — we ship APKs directly per §12). |

`assembleRelease` will fail at `:app:validateSigningRelease` with
**"Keystore file not found"** if `keystore.properties` is missing or
points at a non-existent file. That's intentional — release builds
without a real keystore should fail loudly, not fall back to debug
signing.

## Versioning (§12)

`defaultConfig` in `android/app/build.gradle.kts`:

```kotlin
versionCode = 1      // monotonic integer, increment on every release
versionName = "1.0.0" // human-readable, semver
```

Convention: bump `versionCode` by 1 on **every** ship (even hotfix);
bump `versionName` per semver:
- patch (`1.0.x`) — bug fixes only
- minor (`1.x.0`) — backwards-compatible feature additions
- major (`x.0.0`) — breaking changes (e.g. backend API contract,
  required-config change)

There is no Play Store, so APK distribution is manual (Telegram /
WhatsApp / direct download per §12). Increment first, build second,
attach the APK to the message.

## ProGuard / R8 (`proguard-rules.pro`)

R8 (the default in AGP 8.x) is enabled via `isMinifyEnabled = true`
plus `isShrinkResources = true`. Keep rules cover:

| Module | Why it needs keep / dontwarn |
|---|---|
| Moshi DTO + JsonAdapter codegen | `<DtoName>JsonAdapter` is instantiated by reflection; without keep, R8 strips it and parsing crashes at runtime. |
| Retrofit | Annotation-driven; `@retrofit2.http.*` methods need to be visible. |
| Room | Entities + DAOs accessed via generated code. |
| Socket.IO 2.x + engine.io | Heavy reflection in `EventEmitter` / `Ack`; without keep, `emit()` throws `NoSuchMethodError`. |
| OkHttp / Okio | `-dontwarn` for optional conscrypt/BC deps that R8 sees as missing. |
| AndroidX / Material | Catch-all `-keep` so framework-internal classes survive. |
| Coil | `-dontwarn coil.**` for the picasso compatibility shim it carries. |
| Coroutines | `-keepnames` for `MainDispatcherFactory` so the ServiceLoader-based dispatcher pickup works. |

If a future dependency starts crashing on release-only builds, the
debugging recipe is:

1. Reproduce with `./gradlew assembleRelease && adb install -r app/build/outputs/apk/release/app-release.apk`.
2. Look at `logcat` for `NoClassDefFoundError`, `NoSuchMethodError`,
   or `IllegalStateException: No JsonAdapter` — those are the
   minify-removed-something signatures.
3. Add `-keep class <package>.** { *; }` or `-dontwarn <package>.**`
   to `proguard-rules.pro`.
4. R8 also writes a `usage.txt` (what got stripped) and `mapping.txt`
   (renames) to `app/build/outputs/mapping/release/` — useful when
   stack traces refer to obfuscated names.

`mapping.txt` is what Crashlytics / Play Console needs to deobfuscate
crash reports. We don't have crash reporting wired up (§16 — out of
scope), but the file is produced for free; keep it next to the APK
when shipping in case it's ever needed.

## Signing scheme

AGP 8.x signs with v1 (JAR) + v2 (APK Signature Scheme v2) by default;
both are explicitly enabled in `signingConfigs.release`. `minSdk = 24`
means v2 alone would suffice, but v1 stays for compatibility with
sideload tools and old verifiers.

Verify a built APK:

```bash
$ANDROID_HOME/build-tools/<version>/apksigner verify --verbose \
  android/app/build/outputs/apk/release/app-release.apk
```

Expected: `Verified using v2 scheme (APK Signature Scheme v2): true`,
`Number of signers: 1`.

## What is NOT here

- **CI signing.** When a CI pipeline lands (not in current scope),
  the keystore should be base64-encoded and stored as an encrypted
  secret; CI step decodes it to a temp file and writes
  `keystore.properties` on the fly. Don't commit the keystore to a
  private repo either — secret rotation needs to be possible without
  rewriting git history.
- **Play Store upload key separation.** Off-Play distribution, so
  we use a single signing key. If we ever publish to Play, App
  Signing requires Google to hold the upload key while we keep the
  release key — different flow.
- **AAB (app bundle).** `bundleRelease` works, but §12 mandates APK
  distribution via messengers; no use for AAB without Play.
- **App-update mechanism in-app.** Users get a new APK file via
  messenger and install manually. No Play-Store-style auto-update.

# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Preserve the line number information for debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ================================
# Moshi - JSON serialization
# ================================
-keepclasseswithmembers class * {
    @com.squareup.moshi.* <methods>;
}
-keep @com.squareup.moshi.JsonQualifier interface *
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# Keep data classes and their fields for Moshi
-keep class com.example.curier_mobile.data.remote.dto.** { *; }
-keep class com.example.curier_mobile.domain.model.** { *; }

# Moshi Kotlin reflection support
-keep class kotlin.reflect.jvm.internal.** { *; }
-keep class kotlin.Metadata { *; }

# ================================
# Retrofit - HTTP client
# ================================
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*

# Keep Retrofit interfaces
-keep interface com.example.curier_mobile.data.remote.api.** { *; }

# Retrofit does reflection on generic parameters
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# ================================
# Room - Database
# ================================
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Keep Room entities
-keep class com.example.curier_mobile.data.local.entity.** { *; }
-keep class com.example.curier_mobile.data.local.dao.** { *; }

# ================================
# Kotlin Coroutines
# ================================
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# ================================
# AndroidX & Material
# ================================
-keep class androidx.** { *; }
-keep class com.google.android.material.** { *; }
-dontwarn androidx.**
-dontwarn com.google.android.material.**

# ================================
# Security Crypto
# ================================
-keep class androidx.security.crypto.** { *; }

# ================================
# Navigation Component
# ================================
-keepnames class androidx.navigation.fragment.NavHostFragment

# ================================
# Moshi - JsonAdapter codegen (§7.9)
# ================================
# Moshi-codegen генерирует <DtoName>JsonAdapter рядом с каждой data-class.
# Эти классы инстанцируются reflection'ом — без явного keep ProGuard их
# удаляет, и парсинг падает в рантайме.
-keep class **JsonAdapter { *; }
-keepnames @com.squareup.moshi.JsonClass class *

# ================================
# Socket.IO 2.x client (§7.9)
# ================================
# io.socket:socket.io-client:2.1.0 + engine.io используют reflection в
# Ack / EventEmitter; на R8 без этих keep падает с NoSuchMethodError на
# первом emit. Также подавляем warnings для нативных deps (json-org
# исключён транзитивно — см. build.gradle).
-keep class io.socket.** { *; }
-keep interface io.socket.** { *; }
-keep class io.engineio.** { *; }
-keep interface io.engineio.** { *; }
-dontwarn io.socket.**
-dontwarn io.engineio.**
-dontwarn org.slf4j.**

# ================================
# OkHttp / Okio — extra dontwarn for R8 (§7.9)
# ================================
# R8 ругается на отсутствующие опциональные deps OkHttp (conscrypt, BCJSSE).
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ================================
# Coil — image loader (§7.9)
# ================================
-dontwarn coil.**
-dontwarn com.squareup.picasso.**
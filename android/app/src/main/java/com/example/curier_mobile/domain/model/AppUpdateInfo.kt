package com.example.curier_mobile.domain.model

/**
 * Доменная модель доступного обновления приложения. Сравнивается с
 * `BuildConfig.VERSION_CODE` для решения, показывать ли диалог обновления.
 */
data class AppUpdateInfo(
    val versionCode: Int,
    val versionName: String,
    val releaseNotes: String?,
    val isMandatory: Boolean,
    /** Абсолютный URL APK (GitHub release asset). */
    val downloadUrl: String,
    val fileSize: Long
)

package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.JsonClass

/**
 * Последняя опубликованная версия приложения (`GET /api/app/latest`).
 * Backend контракт: AppReleasesModule → `AppReleaseMeta`. Эндпоинт публичный
 * (без JWT) — проверка обновления работает и до логина.
 */
@JsonClass(generateAdapter = true)
data class AppVersionDto(
    val id: String,
    val versionCode: Int,
    val versionName: String,
    val releaseNotes: String? = null,
    val fileSize: Long,
    val sha256: String,
    val isMandatory: Boolean = false,
    val gitCommit: String? = null,
    /** Относительный путь, к которому клиент добавляет base URL. */
    val downloadUrl: String,
    val createdAt: String
)

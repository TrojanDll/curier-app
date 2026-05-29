package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Релиз из GitHub Releases API
 * (`GET https://api.github.com/repos/<owner>/<repo>/releases/latest`).
 *
 * Приложение проверяет обновление напрямую из open-source репозитория проекта,
 * без участия backend/админки. Подписанный APK лежит в `assets` под именем
 * `curier-<versionCode>.apk` (его кладёт CI, versionCode = github.run_number).
 */
@JsonClass(generateAdapter = true)
data class GithubReleaseDto(
    @Json(name = "tag_name") val tagName: String,
    val name: String? = null,
    val body: String? = null,
    val draft: Boolean = false,
    val prerelease: Boolean = false,
    val assets: List<GithubAssetDto> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class GithubAssetDto(
    val name: String,
    @Json(name = "browser_download_url") val browserDownloadUrl: String,
    val size: Long = 0,
)

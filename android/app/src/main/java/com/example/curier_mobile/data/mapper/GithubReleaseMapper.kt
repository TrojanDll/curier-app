package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.remote.dto.GithubReleaseDto
import com.example.curier_mobile.domain.model.AppUpdateInfo

private val APK_ASSET_REGEX = Regex("""curier-(\d+)\.apk""", RegexOption.IGNORE_CASE)

/**
 * Маппит GitHub-релиз в доменную модель обновления.
 *
 * versionCode извлекается из имени APK-asset'а `curier-<code>.apk` (его кладёт
 * CI, code = github.run_number). versionName — тег релиза без префикса `v`.
 * Возвращает null, если в релизе нет APK-asset'а (ставить нечего).
 */
fun GithubReleaseDto.toAppUpdateInfo(): AppUpdateInfo? {
    val asset = assets.firstOrNull { APK_ASSET_REGEX.containsMatchIn(it.name) } ?: return null
    val versionCode = APK_ASSET_REGEX.find(asset.name)
        ?.groupValues?.getOrNull(1)
        ?.toIntOrNull()
        ?: return null
    return AppUpdateInfo(
        versionCode = versionCode,
        versionName = tagName.removePrefix("v"),
        releaseNotes = body?.takeIf { it.isNotBlank() },
        isMandatory = false,
        downloadUrl = asset.browserDownloadUrl,
        fileSize = asset.size,
    )
}

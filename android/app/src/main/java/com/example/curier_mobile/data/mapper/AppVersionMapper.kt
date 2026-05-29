package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.remote.dto.AppVersionDto
import com.example.curier_mobile.domain.model.AppUpdateInfo

fun AppVersionDto.toDomainModel(): AppUpdateInfo = AppUpdateInfo(
    versionCode = versionCode,
    versionName = versionName,
    releaseNotes = releaseNotes,
    isMandatory = isMandatory,
    downloadUrl = downloadUrl,
    fileSize = fileSize
)

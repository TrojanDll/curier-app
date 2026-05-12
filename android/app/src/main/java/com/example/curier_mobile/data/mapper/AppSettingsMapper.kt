package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.remote.dto.AppSettingsDto
import com.example.curier_mobile.domain.model.AppSettings

fun AppSettingsDto.toDomainModel(): AppSettings = AppSettings(
    photoTtlDays = photoTtlDays,
    supportContact = supportContact?.takeIf { it.isNotBlank() }
)

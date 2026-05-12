package com.example.curier_mobile.domain.model

/**
 * Runtime-настройки приложения, читаемые курьером (§7.8). Сейчас тут только
 * информационные поля для экрана Profile; запись делается админом.
 */
data class AppSettings(
    val photoTtlDays: Int,
    val supportContact: String?
)

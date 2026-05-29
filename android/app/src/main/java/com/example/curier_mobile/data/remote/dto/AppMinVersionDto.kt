package com.example.curier_mobile.data.remote.dto

/**
 * Ответ публичного `GET /api/app/min-version`: минимально совместимая
 * `versionCode` приложения для настроенного сервера. Если установленная версия
 * меньше — требуется обязательное (блокирующее) обновление.
 */
data class AppMinVersionDto(
    val minVersionCode: Int,
)

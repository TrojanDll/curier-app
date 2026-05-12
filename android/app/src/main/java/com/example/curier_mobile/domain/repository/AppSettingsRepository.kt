package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.AppSettings

interface AppSettingsRepository {

    /**
     * Тянет `GET /api/courier/settings` (§7.8). Используется экраном Profile
     * для информационных блоков (TTL фото + контакт поддержки). Не кешируем
     * — экран открывается редко, а свежесть важнее одного round-trip.
     */
    suspend fun getSettings(): Result<AppSettings>
}

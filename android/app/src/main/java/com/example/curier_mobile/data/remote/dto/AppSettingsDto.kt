package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.JsonClass

/**
 * Подмножество `app_settings`, доступное курьеру через `GET /api/courier/settings`
 * (§7.8). Backend контракт: `docs/settings.md` → `PublicAppSettingsView`.
 * Поля admin-internal (`updatedAt` и будущие audit-колонки) сюда не попадают.
 */
@JsonClass(generateAdapter = true)
data class AppSettingsDto(
    val photoTtlDays: Int,
    /**
     * Свободный текст, который админ задаёт в `/admin/settings`. `null` —
     * не сконфигурирован, UI показывает дефолтный hint.
     */
    val supportContact: String? = null
)

package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.JsonClass

/**
 * Метаданные фото — соответствует `PhotoMeta` бэкенда. См. `docs/photos.md`.
 *
 * Отдаётся:
 * - `POST /api/courier/orders/:id/photo` — единичный объект (201);
 * - `GET /api/courier/orders/:id` — массив `photos: PhotoMeta[]` внутри `OrderDto`.
 */
@JsonClass(generateAdapter = true)
data class PhotoMetaDto(
    val id: String,
    val uploadedAt: String,
    val expiresAt: String
)

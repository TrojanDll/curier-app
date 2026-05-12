package com.example.curier_mobile.domain.model

/**
 * Метаданные фотографии доставки.
 *
 * Сами байты выдаются защищённым endpoint-ом
 * `GET /api/courier/orders/<orderId>/photo/<id>` (см. `docs/photos.md`),
 * который требует Bearer-токен. Поэтому здесь храним только id и
 * timestamps — URL собираем в UI на стороне Coil-загрузчика.
 */
data class Photo(
    val id: String,
    val uploadedAt: String,
    val expiresAt: String
)

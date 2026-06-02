package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.JsonClass

/**
 * Order DTO — соответствует `OrderCourierResponse` бэкенда
 * (см. `docs/orders.md`). Поле `price` отсутствует у курьера по §15.1.
 *
 * Бэкенд отвечает чистым JSON-объектом без обёртки `{ success, message }`.
 */
@JsonClass(generateAdapter = true)
data class OrderDto(
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String? = null,
    val deliveryAddress: String,
    val productDescription: String? = null,
    val comments: String? = null,
    val status: String,
    val priority: String = "normal",
    val courierId: String? = null,
    val createdAt: String,
    val assignedAt: String? = null,
    val pickedUpAt: String? = null,
    val nearCustomerAt: String? = null,
    val deliveredAt: String? = null,
    val returnedAt: String? = null,
    val cancelledAt: String? = null,
    val cancellationReason: String? = null,
    val photos: List<PhotoMetaDto> = emptyList()
)

/**
 * Body для `PUT /api/courier/orders/:id/status`. Бэк ставит timestamp сам,
 * клиентский timestamp не нужен. `cancellationReason` обязателен только при
 * `status = "cancelled"` — иначе не отправляется (null).
 */
@JsonClass(generateAdapter = true)
data class UpdateStatusRequest(
    val status: String,
    val cancellationReason: String? = null
)

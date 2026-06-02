package com.example.curier_mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity для кэширования заказов.
 *
 * Фото (`OrderCourierResponse.photos`) не кэшируем — список фото нужен
 * только в `OrderDetails` и обновляется при каждом fetch. Хранить
 * сырые `Photo` отдельной таблицей было бы лишним для UI, которое
 * всегда показывает свежий ответ API.
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String?,
    val deliveryAddress: String,
    val productDescription: String?,
    val comments: String?,
    val status: String,
    val priority: String,
    val courierId: String?,
    val createdAt: String,
    val assignedAt: String?,
    val pickedUpAt: String?,
    val nearCustomerAt: String?,
    val deliveredAt: String?,
    val returnedAt: String?,
    val cancelledAt: String?,
    val cancellationReason: String?
)

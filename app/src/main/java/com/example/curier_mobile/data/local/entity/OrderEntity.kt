package com.example.curier_mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entity для хранения заказов в локальной БД
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val deliveryAddress: String,
    val customerPhone: String,
    val productDescription: String,
    val comments: String?,
    val status: String,
    val assignedAt: Long,
    val photoUrl: String?,
    val updatedAt: Long
)

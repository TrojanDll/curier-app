package com.example.curier_mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for storing orders in local database
 * Cached from API for offline access
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey
    val id: Long,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String,
    val deliveryAddress: String,
    val productDescription: String,
    val comments: String?,
    val status: String, // "picked_up", "near_customer", "delivered", "returned"
    val statusUpdatedAt: String?, // ISO 8601 timestamp
    val assignedAt: String, // ISO 8601 timestamp
    val completedAt: String? // ISO 8601 timestamp
)

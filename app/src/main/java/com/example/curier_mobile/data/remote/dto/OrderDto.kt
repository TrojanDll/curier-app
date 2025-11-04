package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Order DTOs for active orders, history, details, and status updates
 */

@JsonClass(generateAdapter = true)
data class OrdersResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: List<OrderDto>
)

@JsonClass(generateAdapter = true)
data class OrderResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: OrderDto?
)

@JsonClass(generateAdapter = true)
data class OrderDto(
    @Json(name = "id")
    val id: Long,

    @Json(name = "order_number")
    val orderNumber: String,

    @Json(name = "customer_name")
    val customerName: String,

    @Json(name = "customer_phone")
    val customerPhone: String,

    @Json(name = "delivery_address")
    val deliveryAddress: String,

    @Json(name = "product_description")
    val productDescription: String,

    @Json(name = "comments")
    val comments: String?,

    @Json(name = "status")
    val status: String, // "picked_up", "near_customer", "delivered", "returned"

    @Json(name = "status_updated_at")
    val statusUpdatedAt: String?, // ISO 8601 timestamp

    @Json(name = "assigned_at")
    val assignedAt: String, // ISO 8601 timestamp

    @Json(name = "completed_at")
    val completedAt: String?, // ISO 8601 timestamp

    @Json(name = "photo_url")
    val photoUrl: String?
)

@JsonClass(generateAdapter = true)
data class UpdateStatusRequest(
    @Json(name = "status")
    val status: String, // "picked_up", "near_customer", "delivered", "returned"

    @Json(name = "timestamp")
    val timestamp: String // ISO 8601 timestamp
)

@JsonClass(generateAdapter = true)
data class UpdateStatusResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: OrderDto?
)

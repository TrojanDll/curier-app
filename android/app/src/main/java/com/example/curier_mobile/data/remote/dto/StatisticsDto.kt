package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Statistics DTOs for courier delivery statistics
 */

@JsonClass(generateAdapter = true)
data class StatisticsResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: StatisticsWrapper?
)

@JsonClass(generateAdapter = true)
data class StatisticsWrapper(
    @Json(name = "statistics")
    val statistics: StatisticsData
)

@JsonClass(generateAdapter = true)
data class StatisticsData(
    @Json(name = "total_deliveries")
    val totalDeliveries: Int,

    @Json(name = "successful_deliveries")
    val successfulDeliveries: Int,

    @Json(name = "returned_orders")
    val returnedOrders: Int,

    @Json(name = "avg_delivery_time")
    val avgDeliveryTime: Int // minutes
)

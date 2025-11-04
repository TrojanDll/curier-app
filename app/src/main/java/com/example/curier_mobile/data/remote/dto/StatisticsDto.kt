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
    val data: StatisticsData?
)

@JsonClass(generateAdapter = true)
data class StatisticsData(
    @Json(name = "total_deliveries")
    val totalDeliveries: Int,

    @Json(name = "completed_deliveries")
    val completedDeliveries: Int,

    @Json(name = "average_delivery_time_minutes")
    val averageDeliveryTimeMinutes: Int,

    @Json(name = "success_rate")
    val successRate: Double, // 0.0 to 1.0

    @Json(name = "period_start")
    val periodStart: String, // ISO 8601 timestamp

    @Json(name = "period_end")
    val periodEnd: String // ISO 8601 timestamp
)

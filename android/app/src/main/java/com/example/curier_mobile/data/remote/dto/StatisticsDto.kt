package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.JsonClass

/**
 * Statistics DTO для `GET /api/courier/statistics` (`CourierSelfStatsResponse`).
 * См. `docs/statistics.md`.
 */
@JsonClass(generateAdapter = true)
data class StatisticsDto(
    val period: StatisticsPeriodDto,
    val totalDeliveries: Int,
    val successfulDeliveries: Int,
    val returnedOrders: Int,
    val avgDeliveryTimeMinutes: Int? = null
)

@JsonClass(generateAdapter = true)
data class StatisticsPeriodDto(
    val from: String,
    val to: String
)

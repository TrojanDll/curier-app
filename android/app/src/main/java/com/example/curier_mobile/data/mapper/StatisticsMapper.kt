package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.remote.dto.StatisticsData
import com.example.curier_mobile.domain.model.Statistics

/**
 * Mapper for Statistics DTO → Domain Model
 */

fun StatisticsData.toDomainModel(): Statistics {
    val successRate = if (totalDeliveries > 0) {
        successfulDeliveries.toDouble() / totalDeliveries.toDouble()
    } else {
        0.0
    }

    return Statistics(
        totalDeliveries = totalDeliveries,
        completedDeliveries = successfulDeliveries,
        averageDeliveryTimeMinutes = avgDeliveryTime,
        successRate = successRate,
        periodStart = "",
        periodEnd = ""
    )
}

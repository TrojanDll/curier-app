package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.remote.dto.StatisticsData
import com.example.curier_mobile.domain.model.Statistics

/**
 * Mapper for Statistics DTO → Domain Model
 */

fun StatisticsData.toDomainModel(): Statistics {
    return Statistics(
        totalDeliveries = totalDeliveries,
        completedDeliveries = completedDeliveries,
        averageDeliveryTimeMinutes = averageDeliveryTimeMinutes,
        successRate = successRate,
        periodStart = periodStart,
        periodEnd = periodEnd
    )
}

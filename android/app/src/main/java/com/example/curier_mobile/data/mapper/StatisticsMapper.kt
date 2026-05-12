package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.remote.dto.StatisticsDto
import com.example.curier_mobile.domain.model.Statistics

fun StatisticsDto.toDomainModel(): Statistics {
    return Statistics(
        totalDeliveries = totalDeliveries,
        completedDeliveries = successfulDeliveries,
        returnedDeliveries = returnedOrders,
        averageDeliveryTimeMinutes = avgDeliveryTimeMinutes,
        periodFrom = period.from,
        periodTo = period.to
    )
}

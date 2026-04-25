package com.example.curier_mobile.domain.model

/**
 * Domain model for Courier Statistics
 */
data class Statistics(
    val totalDeliveries: Int,
    val completedDeliveries: Int,
    val averageDeliveryTimeMinutes: Int,
    val successRate: Double, // 0.0 to 1.0
    val periodStart: String, // ISO 8601 timestamp
    val periodEnd: String // ISO 8601 timestamp
)

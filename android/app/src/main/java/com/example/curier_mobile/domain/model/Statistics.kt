package com.example.curier_mobile.domain.model

/**
 * Domain model для статистики курьера.
 *
 * Соответствует `CourierSelfStatsResponse` (см. `docs/statistics.md`).
 *
 * - `completedDeliveries` — заказы со статусом `delivered` или `returned`
 *   (бэк отдаёт это в `successfulDeliveries`).
 * - `returnedDeliveries` — заказы со статусом `returned`
 *   (полностью закрытый цикл).
 * - `averageDeliveryTimeMinutes = null` — нет завершённых доставок в окне.
 */
data class Statistics(
    val totalDeliveries: Int,
    val completedDeliveries: Int,
    val returnedDeliveries: Int,
    val averageDeliveryTimeMinutes: Int?,
    val periodFrom: String?,
    val periodTo: String?
) {
    val successRate: Double
        get() = if (totalDeliveries > 0) {
            completedDeliveries.toDouble() / totalDeliveries.toDouble()
        } else {
            0.0
        }
}

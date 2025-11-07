package com.example.curier_mobile.domain.model

/**
 * Domain model for Order
 * Clean domain entity without platform-specific annotations
 */
data class Order(
    val id: Long,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String?,
    val deliveryAddress: String,
    val productDescription: String,
    val comments: String?,
    val status: OrderStatus,
    val statusUpdatedAt: String?,
    val assignedAt: String,
    val completedAt: String?,
    val photoUrl: String?
)

/**
 * Order status enum
 */
enum class OrderStatus(val value: String, val displayName: String) {
    ASSIGNED("assigned", "Назначен"),
    PICKED_UP("picked_up", "Забрал заказ"),
    NEAR_CUSTOMER("near_customer", "Возле дома клиента"),
    DELIVERED("delivered", "Передал заказ"),
    RETURNED("returned", "Вернулся на предприятие");

    companion object {
        fun fromValue(value: String): OrderStatus {
            return entries.find { it.value == value }
                ?: throw IllegalArgumentException("Unknown status: $value")
        }

        /**
         * Get next status in workflow
         * Returns null if current status is final (RETURNED)
         */
        fun getNextStatus(current: OrderStatus): OrderStatus? {
            return when (current) {
                ASSIGNED -> PICKED_UP
                PICKED_UP -> NEAR_CUSTOMER
                NEAR_CUSTOMER -> DELIVERED
                DELIVERED -> RETURNED
                RETURNED -> null
            }
        }

        /**
         * Check if status transition is valid
         */
        fun isValidTransition(from: OrderStatus, to: OrderStatus): Boolean {
            return getNextStatus(from) == to
        }
    }
}

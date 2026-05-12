package com.example.curier_mobile.domain.model

/**
 * Domain model для заказа курьера.
 *
 * Согласуется с `OrderCourierResponse` бэкенда (см. `docs/orders.md`),
 * поэтому здесь нет поля `price` — оно admin-only.
 */
data class Order(
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String?,
    val deliveryAddress: String,
    val productDescription: String?,
    val comments: String?,
    val status: OrderStatus,
    val courierId: String?,
    val createdAt: String,
    val assignedAt: String?,
    val pickedUpAt: String?,
    val nearCustomerAt: String?,
    val deliveredAt: String?,
    val returnedAt: String?,
    val photos: List<Photo> = emptyList()
)

/**
 * Order status enum. Совпадает с `OrderStatus` на бэке.
 *
 * `NEW` присутствует для полноты, но курьер видит только заказы
 * в `assigned+` (бэк-фильтр в `GET /api/courier/orders/active`).
 */
enum class OrderStatus(val value: String, val displayName: String) {
    NEW("new", "Новый"),
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
         * Single-step transition allowed for couriers.
         * `NEW` -> `ASSIGNED` происходит только на бэке (auto-assign);
         * курьер не может его двигать.
         */
        fun getNextStatus(current: OrderStatus): OrderStatus? {
            return when (current) {
                NEW -> null
                ASSIGNED -> PICKED_UP
                PICKED_UP -> NEAR_CUSTOMER
                NEAR_CUSTOMER -> DELIVERED
                DELIVERED -> RETURNED
                RETURNED -> null
            }
        }

        fun isValidTransition(from: OrderStatus, to: OrderStatus): Boolean {
            return getNextStatus(from) == to
        }
    }
}

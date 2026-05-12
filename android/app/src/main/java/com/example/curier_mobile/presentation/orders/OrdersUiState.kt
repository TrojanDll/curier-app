package com.example.curier_mobile.presentation.orders

import com.example.curier_mobile.domain.model.Order

/**
 * UI state for the orders list screen.
 *
 * `isCurrentCourierPaused` отражает `couriers.is_paused` бэкенда: пока
 * курьер на паузе, auto-assign не дёргает его. UI показывает баннер,
 * чтобы курьер понимал, почему не приходят новые заказы.
 */
data class OrdersUiState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isCurrentCourierPaused: Boolean = false,
    val error: String? = null
)

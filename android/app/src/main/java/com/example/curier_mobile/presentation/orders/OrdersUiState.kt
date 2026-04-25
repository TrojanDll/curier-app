package com.example.curier_mobile.presentation.orders

import com.example.curier_mobile.domain.model.Order

/**
 * UI state for orders list screen
 */
data class OrdersUiState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null
)

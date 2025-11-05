package com.example.curier_mobile.presentation.orders

import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus

data class OrderDetailsUiState(
    val order: Order? = null,
    val isLoading: Boolean = false,
    val isUpdatingStatus: Boolean = false,
    val error: String? = null,
    val statusUpdateSuccess: Boolean = false,
    val availableStatusTransitions: List<OrderStatus> = emptyList()
)

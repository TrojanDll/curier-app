package com.example.curier_mobile.presentation.history

import com.example.curier_mobile.domain.model.Order

data class HistoryUiState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val startDate: String? = null,
    val endDate: String? = null
)

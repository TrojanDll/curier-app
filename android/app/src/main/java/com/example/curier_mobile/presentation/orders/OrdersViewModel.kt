package com.example.curier_mobile.presentation.orders

import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.presentation.common.BaseViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel for active orders list
 * Manages orders state with Flow-based reactive updates
 */
class OrdersViewModel(
    private val orderRepository: OrderRepository
) : BaseViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    init {
        // Observe real-time updates from database
        observeOrders()
        // Fetch fresh data from API
        loadOrders()
    }

    /**
     * Observe orders from local database (reactive updates)
     */
    private fun observeOrders() {
        viewModelScope.launch {
            orderRepository.getActiveOrdersFlow().collect { orders ->
                _uiState.update { it.copy(orders = orders) }
            }
        }
    }

    /**
     * Load orders from API and cache in database
     */
    fun loadOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = orderRepository.getActiveOrders()) {
                is Result.Success -> {
                    _uiState.update { it.copy(isLoading = false) }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.exception.message ?: "Ошибка загрузки заказов"
                        )
                    }
                    showError(result.exception.message ?: "Ошибка загрузки заказов")
                }
                is Result.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Refresh orders (for SwipeRefreshLayout)
     */
    fun refreshOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null) }

            when (val result = orderRepository.getActiveOrders()) {
                is Result.Success -> {
                    _uiState.update { it.copy(isRefreshing = false) }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isRefreshing = false,
                            error = result.exception.message ?: "Ошибка обновления"
                        )
                    }
                    showError(result.exception.message ?: "Ошибка обновления")
                }
                is Result.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

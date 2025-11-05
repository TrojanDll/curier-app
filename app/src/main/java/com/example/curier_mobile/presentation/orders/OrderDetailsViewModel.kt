package com.example.curier_mobile.presentation.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.core.result.Result
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class OrderDetailsViewModel(
    private val orderRepository: OrderRepository,
    private val orderId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderDetailsUiState())
    val uiState: StateFlow<OrderDetailsUiState> = _uiState.asStateFlow()

    init {
        loadOrderDetails()
    }

    private fun loadOrderDetails() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = orderRepository.getOrderById(orderId.toLong())) {
                is Result.Success -> {
                    val order = result.data
                    val availableTransitions = getAvailableStatusTransitions(order.status)
                    _uiState.update {
                        it.copy(
                            order = order,
                            isLoading = false,
                            availableStatusTransitions = availableTransitions
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.exception.message ?: "Ошибка загрузки заказа"
                        )
                    }
                }
                is Result.Loading -> {
                    // Already handled by initial state update
                }
            }
        }
    }

    fun updateOrderStatus(newStatus: OrderStatus) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingStatus = true, error = null) }

            when (val result = orderRepository.updateOrderStatus(orderId.toLong(), newStatus)) {
                is Result.Success -> {
                    val updatedOrder = result.data
                    val availableTransitions = getAvailableStatusTransitions(updatedOrder.status)
                    _uiState.update {
                        it.copy(
                            order = updatedOrder,
                            isUpdatingStatus = false,
                            statusUpdateSuccess = true,
                            availableStatusTransitions = availableTransitions
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isUpdatingStatus = false,
                            error = result.exception.message ?: "Ошибка обновления статуса"
                        )
                    }
                }
                is Result.Loading -> {
                    // Already handled by initial state update
                }
            }
        }
    }

    fun clearStatusUpdateSuccess() {
        _uiState.update { it.copy(statusUpdateSuccess = false) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun getAvailableStatusTransitions(currentStatus: OrderStatus): List<OrderStatus> {
        return when (currentStatus) {
            OrderStatus.PICKED_UP -> listOf(OrderStatus.NEAR_CUSTOMER)
            OrderStatus.NEAR_CUSTOMER -> listOf(OrderStatus.DELIVERED, OrderStatus.RETURNED)
            OrderStatus.DELIVERED -> listOf(OrderStatus.RETURNED)
            OrderStatus.RETURNED -> emptyList()
        }
    }
}

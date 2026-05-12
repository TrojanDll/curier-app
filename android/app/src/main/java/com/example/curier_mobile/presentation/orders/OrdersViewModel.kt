package com.example.curier_mobile.presentation.orders

import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.domain.repository.ProfileRepository
import com.example.curier_mobile.presentation.common.BaseViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel for active orders list.
 *
 * Дополнительно при загрузке тянет профиль курьера, чтобы знать флаг
 * `is_paused` и показать соответствующий баннер (§7.5). Ошибки загрузки
 * профиля игнорируем — баннер не критичен, заказы важнее.
 */
class OrdersViewModel(
    private val orderRepository: OrderRepository,
    private val profileRepository: ProfileRepository
) : BaseViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    init {
        observeOrders()
        loadOrders()
        refreshPausedState()
    }

    private fun observeOrders() {
        viewModelScope.launch {
            orderRepository.getActiveOrdersFlow().collect { orders ->
                _uiState.update { it.copy(orders = orders) }
            }
        }
    }

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
                is Result.Loading -> Unit
            }
        }
    }

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
                is Result.Loading -> Unit
            }
            refreshPausedState()
        }
    }

    private fun refreshPausedState() {
        viewModelScope.launch {
            when (val result = profileRepository.getProfile()) {
                is Result.Success -> {
                    _uiState.update { it.copy(isCurrentCourierPaused = result.data.isPaused) }
                }
                is Result.Error -> Unit  // тихо игнорируем, см. KDoc выше
                is Result.Loading -> Unit
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

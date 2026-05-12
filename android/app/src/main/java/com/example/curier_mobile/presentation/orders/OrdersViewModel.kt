package com.example.curier_mobile.presentation.orders

import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.remote.realtime.RealtimeEvent
import com.example.curier_mobile.data.remote.realtime.RealtimeManager
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.domain.repository.ProfileRepository
import com.example.curier_mobile.presentation.common.BaseViewModel
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel for the active orders list.
 *
 * Подписывается на realtime-канал, чтобы заказы появлялись без ручного
 * pull-to-refresh. Также периодически тянет профиль (см. §7.5) для баннера
 * «вы на паузе».
 */
class OrdersViewModel(
    private val orderRepository: OrderRepository,
    private val profileRepository: ProfileRepository,
    private val realtimeManager: RealtimeManager
) : BaseViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    /**
     * Уведомление о вновь назначенном заказе. UI слушает и показывает
     * Snackbar / Toast — один shot на событие, поэтому SharedFlow без replay.
     */
    private val _newOrderEvents = MutableSharedFlow<Order>(
        replay = 0,
        extraBufferCapacity = 4,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val newOrderEvents: SharedFlow<Order> = _newOrderEvents.asSharedFlow()

    init {
        observeOrders()
        observeRealtime()
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

    private fun observeRealtime() {
        viewModelScope.launch {
            realtimeManager.events.collect { event ->
                when (event) {
                    is RealtimeEvent.OrderAssigned -> {
                        orderRepository.cacheOrder(event.order)
                        _newOrderEvents.tryEmit(event.order)
                    }
                    is RealtimeEvent.OrderReassigned -> {
                        // Обновляем кэш — если заказ перешёл к другому курьеру,
                        // в активном списке он скоро отфильтруется по статусу
                        // следующим REST-запросом. Если же к нам — он появится.
                        orderRepository.cacheOrder(event.order)
                    }
                }
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
                is Result.Error -> Unit
                is Result.Loading -> Unit
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    @Suppress("unused")
    private fun statusForFiltering(): OrderStatus = OrderStatus.ASSIGNED
}

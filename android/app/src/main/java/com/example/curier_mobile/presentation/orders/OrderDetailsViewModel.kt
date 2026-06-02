package com.example.curier_mobile.presentation.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.remote.realtime.RealtimeEvent
import com.example.curier_mobile.data.remote.realtime.RealtimeManager
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.repository.OrderRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class OrderDetailsViewModel(
    private val orderRepository: OrderRepository,
    private val realtimeManager: RealtimeManager,
    private val orderId: String
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderDetailsUiState())
    val uiState: StateFlow<OrderDetailsUiState> = _uiState.asStateFlow()

    /**
     * Гард от повторной загрузки фото при пересоздании fragment-а (например,
     * после rotation). PhotoCaptureFragment возвращается на details через
     * `popUpToInclusive=true` — каждый такой возврат создаёт новый Fragment +
     * ViewModel, поэтому флаг привязан к жизни ViewModel-а и сбросится сам
     * собой при следующем заходе на экран.
     */
    private var capturedPhotoConsumed = false

    init {
        loadOrderDetails()
        observeRealtime()
    }

    /**
     * Подписка на realtime: если приходит событие про текущий заказ
     * (например, админ переназначил), кладём его в state без дополнительного
     * REST-запроса.
     */
    private fun observeRealtime() {
        viewModelScope.launch {
            realtimeManager.events.collect { event ->
                val updated = when (event) {
                    is RealtimeEvent.OrderAssigned -> event.order
                    is RealtimeEvent.OrderReassigned -> event.order
                }
                if (updated.id == orderId) {
                    orderRepository.cacheOrder(updated)
                    _uiState.update {
                        it.copy(
                            order = updated,
                            availableStatusTransitions = getAvailableStatusTransitions(updated.status),
                            canCancel = isCancellable(updated.status)
                        )
                    }
                }
            }
        }
    }

    private fun loadOrderDetails() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = orderRepository.getOrderById(orderId)) {
                is Result.Success -> {
                    val order = result.data
                    val availableTransitions = getAvailableStatusTransitions(order.status)
                    _uiState.update {
                        it.copy(
                            order = order,
                            isLoading = false,
                            availableStatusTransitions = availableTransitions,
                            canCancel = isCancellable(order.status)
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
                is Result.Loading -> Unit
            }
        }
    }

    fun updateOrderStatus(newStatus: OrderStatus) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingStatus = true, error = null) }

            when (val result = orderRepository.updateOrderStatus(orderId, newStatus)) {
                is Result.Success -> {
                    val updatedOrder = result.data
                    val availableTransitions = getAvailableStatusTransitions(updatedOrder.status)
                    _uiState.update {
                        it.copy(
                            order = updatedOrder,
                            isUpdatingStatus = false,
                            statusUpdateSuccess = true,
                            availableStatusTransitions = availableTransitions,
                            canCancel = isCancellable(updatedOrder.status)
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
                is Result.Loading -> Unit
            }
        }
    }

    /**
     * Отменяет заказ с обязательной причиной (например, «клиент не отвечает»).
     * Заказ переходит в терминальный `cancelled`, освобождая курьера на бэке.
     */
    fun cancelOrder(reason: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingStatus = true, error = null) }

            when (val result = orderRepository.cancelOrder(orderId, reason)) {
                is Result.Success -> {
                    val updatedOrder = result.data
                    _uiState.update {
                        it.copy(
                            order = updatedOrder,
                            isUpdatingStatus = false,
                            cancelSuccess = true,
                            availableStatusTransitions = getAvailableStatusTransitions(updatedOrder.status),
                            canCancel = isCancellable(updatedOrder.status)
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isUpdatingStatus = false,
                            error = result.exception.message ?: "Ошибка отмены заказа"
                        )
                    }
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun uploadPhoto(photoPath: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingPhoto = true, error = null) }

            val photoFile = java.io.File(photoPath)
            when (val result = orderRepository.uploadPhoto(orderId, photoFile)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isUploadingPhoto = false,
                            photoUploadSuccess = true,
                            lastUploadedPhotoId = result.data.id
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isUploadingPhoto = false,
                            error = result.exception.message ?: "Ошибка загрузки фото"
                        )
                    }
                }
                is Result.Loading -> Unit
            }
        }
    }

    /**
     * Загружает фото, захваченное PhotoCaptureFragment-ом и пробрасываемое
     * сюда через nav-аргумент `photoPath`. Идемпотентно в пределах жизни
     * ViewModel-а — на повторных вызовах с тем же путём ничего не делает,
     * чтобы rotation/recreation не приводили к двойному multipart-запросу.
     */
    fun consumeCapturedPhotoPath(photoPath: String?) {
        if (photoPath.isNullOrBlank() || capturedPhotoConsumed) return
        capturedPhotoConsumed = true
        uploadPhoto(photoPath)
    }

    fun clearStatusUpdateSuccess() {
        _uiState.update { it.copy(statusUpdateSuccess = false) }
    }

    fun clearCancelSuccess() {
        _uiState.update { it.copy(cancelSuccess = false) }
    }

    fun clearPhotoUploadSuccess() {
        _uiState.update { it.copy(photoUploadSuccess = false) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun getAvailableStatusTransitions(currentStatus: OrderStatus): List<OrderStatus> {
        return when (currentStatus) {
            OrderStatus.NEW -> emptyList()
            OrderStatus.ASSIGNED -> listOf(OrderStatus.PICKED_UP)
            OrderStatus.PICKED_UP -> listOf(OrderStatus.NEAR_CUSTOMER)
            OrderStatus.NEAR_CUSTOMER -> listOf(OrderStatus.DELIVERED, OrderStatus.RETURNED)
            OrderStatus.DELIVERED -> listOf(OrderStatus.RETURNED)
            OrderStatus.RETURNED -> emptyList()
            OrderStatus.CANCELLED -> emptyList()
        }
    }

    /** Отмена доступна, пока заказ не доставлен и не закрыт. Кнопка «Отменить»
     *  показывается отдельно от forward-переходов. */
    private fun isCancellable(status: OrderStatus): Boolean = status in CANCELLABLE_STATUSES

    companion object {
        private val CANCELLABLE_STATUSES = setOf(
            OrderStatus.ASSIGNED,
            OrderStatus.PICKED_UP,
            OrderStatus.NEAR_CUSTOMER
        )
    }
}

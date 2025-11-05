package com.example.curier_mobile.presentation.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.repository.OrderRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class HistoryViewModel(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    init {
        loadHistory()
    }

    fun loadHistory(startDate: String? = null, endDate: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, startDate = startDate, endDate = endDate) }

            when (val result = orderRepository.getOrderHistory(startDate, endDate)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            orders = result.data,
                            isLoading = false
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.exception.message ?: "Ошибка загрузки истории"
                        )
                    }
                }
                is Result.Loading -> {
                    // Already handled
                }
            }
        }
    }

    fun refreshHistory() {
        viewModelScope.launch {
            val currentState = _uiState.value
            _uiState.update { it.copy(isRefreshing = true, error = null) }

            when (val result = orderRepository.getOrderHistory(currentState.startDate, currentState.endDate)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            orders = result.data,
                            isRefreshing = false
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isRefreshing = false,
                            error = result.exception.message ?: "Ошибка обновления истории"
                        )
                    }
                }
                is Result.Loading -> {
                    // Already handled
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}

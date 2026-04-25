package com.example.curier_mobile.presentation.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Базовый ViewModel с поддержкой обработки ошибок и событий
 */
abstract class BaseViewModel : ViewModel() {

    private val _error = MutableSharedFlow<String>()
    val error: SharedFlow<String> = _error.asSharedFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    protected val exceptionHandler = CoroutineExceptionHandler { _, exception ->
        handleException(exception)
    }

    protected fun setLoading(loading: Boolean) {
        _isLoading.value = loading
    }

    protected fun showError(message: String) {
        viewModelScope.launch {
            _error.emit(message)
        }
    }

    protected fun handleException(exception: Throwable) {
        val message = exception.message ?: "Произошла неизвестная ошибка"
        showError(message)
    }

    protected fun <T> Result<T>.handleResult(
        onSuccess: (T) -> Unit,
        onError: ((Exception) -> Unit)? = null,
        onLoading: (() -> Unit)? = null
    ) {
        when (this) {
            is Result.Success -> {
                setLoading(false)
                onSuccess(data)
            }
            is Result.Error -> {
                setLoading(false)
                if (onError != null) {
                    onError(exception)
                } else {
                    showError(message ?: exception.message ?: "Произошла ошибка")
                }
            }
            is Result.Loading -> {
                setLoading(true)
                onLoading?.invoke()
            }
        }
    }
}

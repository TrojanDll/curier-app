package com.example.curier_mobile.presentation.serverconfig

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.di.NetworkModule
import com.example.curier_mobile.core.di.RepositoryModule
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.data.remote.health.ServerHealthCheck
import com.example.curier_mobile.data.remote.health.ServerHealthChecker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ServerConfigViewModel(
    private val serverConfigManager: ServerConfigManager,
    private val healthChecker: ServerHealthCheck = ServerHealthChecker()
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        ServerConfigUiState(
            url = serverConfigManager.getBaseUrl().orEmpty(),
            isConnected = serverConfigManager.hasBaseUrl()
        )
    )
    val uiState: StateFlow<ServerConfigUiState> = _uiState.asStateFlow()

    fun onUrlChanged(url: String) {
        _uiState.update { it.copy(url = url, urlError = null, generalError = null) }
    }

    fun onConnectClicked() {
        val rawUrl = _uiState.value.url.trim()

        val validationError = validate(rawUrl)
        if (validationError != null) {
            _uiState.update { it.copy(urlError = validationError) }
            return
        }

        _uiState.update {
            it.copy(isConnecting = true, urlError = null, generalError = null)
        }

        viewModelScope.launch {
            when (val result = healthChecker.check(rawUrl)) {
                is Result.Success -> {
                    serverConfigManager.saveBaseUrl(rawUrl)
                    NetworkModule.resetClients()
                    RepositoryModule.resetCache()
                    _uiState.update {
                        it.copy(isConnecting = false, isConnected = true)
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isConnecting = false,
                            generalError = result.exception.message
                                ?: "Не удалось подключиться к серверу"
                        )
                    }
                }
                is Result.Loading -> Unit
            }
        }
    }

    fun clearNavigationFlag() {
        _uiState.update { it.copy(isConnected = false) }
    }

    private fun validate(url: String): String? {
        if (url.isBlank()) return "Введите адрес сервера"
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "URL должен начинаться с http:// или https://"
        }
        return try {
            // java.net.URI вместо androidx Uri — последний тянет Android-stub
            // и в JVM-юнит-тестах падает с "Method ... not mocked".
            val parsed = java.net.URI.create(url)
            if (parsed.host.isNullOrBlank()) "Некорректный URL" else null
        } catch (e: Exception) {
            "Некорректный URL"
        }
    }
}

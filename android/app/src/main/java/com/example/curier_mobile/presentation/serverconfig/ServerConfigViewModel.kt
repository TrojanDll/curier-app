package com.example.curier_mobile.presentation.serverconfig

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.di.NetworkModule
import com.example.curier_mobile.core.di.RepositoryModule
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.remote.health.ServerHealthCheck
import com.example.curier_mobile.data.remote.health.ServerHealthChecker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Решает три сценария на старте:
 *  - URL не задан → пользователь видит форму ввода URL.
 *  - URL задан + есть пара токенов → сразу прыгаем на главную (TokenAuthenticator
 *    обновит access прозрачно при первом 401).
 *  - URL задан + токенов нет (или logout их вычистил) → переход на логин.
 *
 * Полная инвалидация sessionStorage (`logout` / «Сменить сервер») сбрасывает
 * токены, поэтому здесь нет отдельной обработки «токены битые» — Authenticator
 * приведёт нас к 401, репозитории вернут Error, фрагменты покажут ошибку.
 */
class ServerConfigViewModel(
    private val serverConfigManager: ServerConfigManager,
    private val tokenManager: TokenManager,
    private val healthChecker: ServerHealthCheck = ServerHealthChecker(),
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        ServerConfigUiState(
            url = serverConfigManager.getBaseUrl().orEmpty(),
            navigateTo = decideInitialTarget(),
        )
    )
    val uiState: StateFlow<ServerConfigUiState> = _uiState.asStateFlow()

    private fun decideInitialTarget(): NavigationTarget? {
        if (!serverConfigManager.hasBaseUrl()) return null
        return if (tokenManager.hasTokens()) NavigationTarget.MAIN else NavigationTarget.LOGIN
    }

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
                    // После ручного ввода URL токенов точно нет (свежая
                    // установка / «Сменить сервер» их обнулил) — идём на
                    // логин. Если когда-нибудь захотим сохранять токены
                    // при смене сервера, поменяем эту строчку на
                    // `decideInitialTarget()`.
                    _uiState.update {
                        it.copy(isConnecting = false, navigateTo = NavigationTarget.LOGIN)
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

    /**
     * Сбрасывает navigation-флаг после того, как фрагмент его прочитал и
     * выполнил `navigate(...)`. Иначе пересоздание view re-trigger-нуло бы
     * навигацию и вылетело с IllegalStateException на повторном popUpTo.
     */
    fun clearNavigationFlag() {
        _uiState.update { it.copy(navigateTo = null) }
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

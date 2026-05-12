package com.example.curier_mobile.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.di.NetworkModule
import com.example.curier_mobile.core.di.RepositoryModule
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.domain.repository.AppSettingsRepository
import com.example.curier_mobile.domain.repository.AuthRepository
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.domain.repository.ProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class ProfileViewModel(
    private val profileRepository: ProfileRepository,
    private val orderRepository: OrderRepository,
    private val authRepository: AuthRepository,
    private val appSettingsRepository: AppSettingsRepository,
    private val serverConfigManager: ServerConfigManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
        loadStatistics()
        loadAppSettings()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            when (val result = profileRepository.getProfile()) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            user = result.data,
                            isLoading = false
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.exception.message ?: "Ошибка загрузки профиля"
                        )
                    }
                }
                is Result.Loading -> {
                    // Already handled
                }
            }
        }
    }

    private fun loadStatistics() {
        viewModelScope.launch {
            when (val result = orderRepository.getStatistics()) {
                is Result.Success -> {
                    _uiState.update { it.copy(statistics = result.data) }
                }
                is Result.Error -> {
                    // Silently ignore statistics errors
                }
                is Result.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Загрузка read-only снимка `GET /api/courier/settings` (§7.8). Ошибки
     * глотаем — в UI просто не покажется значение TTL / контакта поддержки,
     * это информационный блок, без него экран остаётся рабочим.
     */
    private fun loadAppSettings() {
        viewModelScope.launch {
            when (val result = appSettingsRepository.getSettings()) {
                is Result.Success -> {
                    _uiState.update { it.copy(appSettings = result.data) }
                }
                is Result.Error -> {
                    // Silently ignore — see comment above.
                }
                is Result.Loading -> { }
            }
        }
    }

    fun refreshProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, error = null) }

            // Reload profile
            when (val result = profileRepository.getProfile()) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            user = result.data,
                            isRefreshing = false
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isRefreshing = false,
                            error = result.exception.message ?: "Ошибка обновления профиля"
                        )
                    }
                }
                is Result.Loading -> { }
            }

            // Reload statistics (silently)
            when (val result = orderRepository.getStatistics()) {
                is Result.Success -> {
                    _uiState.update { it.copy(statistics = result.data) }
                }
                is Result.Error -> { /* Silently ignore */ }
                is Result.Loading -> { }
            }

            // Reload app settings (silently)
            when (val result = appSettingsRepository.getSettings()) {
                is Result.Success -> {
                    _uiState.update { it.copy(appSettings = result.data) }
                }
                is Result.Error -> { /* Silently ignore */ }
                is Result.Loading -> { }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoggingOut = true, error = null) }

            when (val result = authRepository.logout()) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoggingOut = false,
                            logoutSuccess = true
                        )
                    }
                }
                is Result.Error -> {
                    // Even if network fails, we cleared tokens locally
                    // So still mark as success for UI
                    _uiState.update {
                        it.copy(
                            isLoggingOut = false,
                            logoutSuccess = true
                        )
                    }
                }
                is Result.Loading -> { }
            }
        }
    }

    /**
     * Сменить сервер: logout на бэкенде (best-effort) + сброс BASE_URL и кэша
     * Retrofit/repositories. Fragment после этого навигирует на ServerConfigFragment.
     */
    fun changeServer() {
        viewModelScope.launch {
            _uiState.update { it.copy(isChangingServer = true, error = null) }

            // Best-effort logout — игнорируем сетевые ошибки, локальные токены
            // всё равно будут удалены ниже.
            runCatching { authRepository.logout() }

            serverConfigManager.clearBaseUrl()
            NetworkModule.resetClients()
            RepositoryModule.resetCache()

            _uiState.update {
                it.copy(isChangingServer = false, changeServerSuccess = true)
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun enterEditMode() {
        _uiState.update { it.copy(isEditMode = true) }
    }

    fun exitEditMode() {
        _uiState.update { it.copy(isEditMode = false, updateSuccess = false) }
    }

    fun updateProfile(email: String?, phone: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            when (val result = profileRepository.updateProfile(
                email = email?.takeIf { it.isNotBlank() },
                phone = phone?.takeIf { it.isNotBlank() }
            )) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            user = result.data,
                            isSaving = false,
                            isEditMode = false,
                            updateSuccess = true
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = result.exception.message ?: "Не удалось обновить профиль"
                        )
                    }
                }
                is Result.Loading -> { }
            }
        }
    }

    fun clearUpdateSuccess() {
        _uiState.update { it.copy(updateSuccess = false) }
    }
}

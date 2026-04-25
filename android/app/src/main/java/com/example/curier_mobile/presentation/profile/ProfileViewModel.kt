package com.example.curier_mobile.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
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
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
        loadStatistics()
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
                phone = phone?.takeIf { it.isNotBlank() },
                dateOfBirth = null
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

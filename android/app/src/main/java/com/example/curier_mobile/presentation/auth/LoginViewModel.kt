package com.example.curier_mobile.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * ViewModel for login screen
 * Handles authentication logic and form validation
 */
class LoginViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    /**
     * Update username field
     */
    fun onUsernameChanged(username: String) {
        _uiState.update { it.copy(username = username, usernameError = null) }
    }

    /**
     * Update password field
     */
    fun onPasswordChanged(password: String) {
        _uiState.update { it.copy(password = password, passwordError = null) }
    }

    /**
     * Validate and submit login form
     */
    fun onLoginClicked() {
        val currentState = _uiState.value

        // Clear previous errors
        _uiState.update { it.copy(usernameError = null, passwordError = null, generalError = null) }

        // Validate fields
        var hasErrors = false

        if (currentState.username.isBlank()) {
            _uiState.update { it.copy(usernameError = "Введите логин") }
            hasErrors = true
        }

        if (currentState.password.isBlank()) {
            _uiState.update { it.copy(passwordError = "Введите пароль") }
            hasErrors = true
        } else if (currentState.password.length < 6) {
            _uiState.update { it.copy(passwordError = "Минимум 6 символов") }
            hasErrors = true
        }

        if (hasErrors) return

        // Perform login
        performLogin(currentState.username, currentState.password)
    }

    /**
     * Perform login API call
     */
    private fun performLogin(username: String, password: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }

            when (val result = authRepository.login(username, password)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isLoginSuccessful = true,
                            user = result.data
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            generalError = result.exception.message ?: "Ошибка входа"
                        )
                    }
                }
                is Result.Loading -> {
                    // Already handled
                }
            }
        }
    }

    /**
     * Clear error message
     */
    fun clearError() {
        _uiState.update { it.copy(generalError = null) }
    }
}

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
 * ViewModel for registration screen
 * Handles registration logic and form validation
 */
class RegisterViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

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
     * Update confirm password field
     */
    fun onConfirmPasswordChanged(confirmPassword: String) {
        _uiState.update { it.copy(confirmPassword = confirmPassword, confirmPasswordError = null) }
    }

    /**
     * Update full name field
     */
    fun onFullNameChanged(fullName: String) {
        _uiState.update { it.copy(fullName = fullName, fullNameError = null) }
    }

    /**
     * Update phone field
     */
    fun onPhoneChanged(phone: String) {
        _uiState.update { it.copy(phone = phone, phoneError = null) }
    }

    /**
     * Validate and submit registration form
     */
    fun onRegisterClicked() {
        val currentState = _uiState.value

        // Clear previous errors
        _uiState.update {
            it.copy(
                usernameError = null,
                passwordError = null,
                confirmPasswordError = null,
                fullNameError = null,
                phoneError = null,
                generalError = null
            )
        }

        // Validate fields
        var hasErrors = false

        if (currentState.username.isBlank()) {
            _uiState.update { it.copy(usernameError = "Введите логин") }
            hasErrors = true
        } else if (currentState.username.length < 3) {
            _uiState.update { it.copy(usernameError = "Минимум 3 символа") }
            hasErrors = true
        }

        if (currentState.password.isBlank()) {
            _uiState.update { it.copy(passwordError = "Введите пароль") }
            hasErrors = true
        } else if (currentState.password.length < 6) {
            _uiState.update { it.copy(passwordError = "Минимум 6 символов") }
            hasErrors = true
        }

        if (currentState.confirmPassword.isBlank()) {
            _uiState.update { it.copy(confirmPasswordError = "Подтвердите пароль") }
            hasErrors = true
        } else if (currentState.password != currentState.confirmPassword) {
            _uiState.update { it.copy(confirmPasswordError = "Пароли не совпадают") }
            hasErrors = true
        }

        if (currentState.fullName.isBlank()) {
            _uiState.update { it.copy(fullNameError = "Введите ФИО") }
            hasErrors = true
        } else if (currentState.fullName.length < 2) {
            _uiState.update { it.copy(fullNameError = "Минимум 2 символа") }
            hasErrors = true
        }

        if (currentState.phone.isBlank()) {
            _uiState.update { it.copy(phoneError = "Введите телефон") }
            hasErrors = true
        } else if (!isValidPhone(currentState.phone)) {
            _uiState.update { it.copy(phoneError = "Некорректный формат телефона") }
            hasErrors = true
        }

        if (hasErrors) return

        // Perform registration
        performRegistration(
            username = currentState.username,
            password = currentState.password,
            fullName = currentState.fullName,
            phone = currentState.phone
        )
    }

    /**
     * Validate phone number format
     */
    private fun isValidPhone(phone: String): Boolean {
        // Simple validation: at least 10 digits
        val digitsOnly = phone.filter { it.isDigit() }
        return digitsOnly.length >= 10
    }

    /**
     * Perform registration API call
     */
    private fun performRegistration(
        username: String,
        password: String,
        fullName: String,
        phone: String
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, generalError = null) }

            when (val result = authRepository.register(username, password, fullName, phone)) {
                is Result.Success -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isRegisterSuccessful = true,
                            user = result.data
                        )
                    }
                }
                is Result.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            generalError = result.exception.message ?: "Ошибка регистрации"
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

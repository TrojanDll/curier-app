package com.example.curier_mobile.presentation.auth

import com.example.curier_mobile.domain.model.User

/**
 * UI state for registration screen
 */
data class RegisterUiState(
    val username: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val fullName: String = "",
    val phone: String = "",
    val isLoading: Boolean = false,
    val usernameError: String? = null,
    val passwordError: String? = null,
    val confirmPasswordError: String? = null,
    val fullNameError: String? = null,
    val phoneError: String? = null,
    val generalError: String? = null,
    val isRegisterSuccessful: Boolean = false,
    val user: User? = null
)

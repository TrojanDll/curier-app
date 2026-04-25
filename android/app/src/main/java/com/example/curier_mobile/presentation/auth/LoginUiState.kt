package com.example.curier_mobile.presentation.auth

import com.example.curier_mobile.domain.model.User

/**
 * UI state for login screen
 */
data class LoginUiState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val usernameError: String? = null,
    val passwordError: String? = null,
    val generalError: String? = null,
    val isLoginSuccessful: Boolean = false,
    val user: User? = null
)

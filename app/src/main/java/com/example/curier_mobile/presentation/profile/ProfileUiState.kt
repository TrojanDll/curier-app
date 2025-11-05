package com.example.curier_mobile.presentation.profile

import com.example.curier_mobile.domain.model.Statistics
import com.example.curier_mobile.domain.model.User

data class ProfileUiState(
    val user: User? = null,
    val statistics: Statistics? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null
)

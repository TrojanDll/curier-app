package com.example.curier_mobile.presentation.profile

import com.example.curier_mobile.domain.model.AppSettings
import com.example.curier_mobile.domain.model.Statistics
import com.example.curier_mobile.domain.model.User

data class ProfileUiState(
    val user: User? = null,
    val statistics: Statistics? = null,
    /**
     * Read-only снимок `GET /api/courier/settings` для информационного
     * блока «О приложении» (§7.8). `null` пока не загружено или серверный
     * ответ упал — в этом случае показываем дефолтные дни / общий hint.
     */
    val appSettings: AppSettings? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isLoggingOut: Boolean = false,
    val logoutSuccess: Boolean = false,
    val isChangingServer: Boolean = false,
    val changeServerSuccess: Boolean = false,
    val isEditMode: Boolean = false,
    val isSaving: Boolean = false,
    val updateSuccess: Boolean = false,
    val error: String? = null
)

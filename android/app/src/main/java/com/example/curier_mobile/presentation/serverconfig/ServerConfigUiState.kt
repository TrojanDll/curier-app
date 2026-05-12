package com.example.curier_mobile.presentation.serverconfig

data class ServerConfigUiState(
    val url: String = "",
    val urlError: String? = null,
    val generalError: String? = null,
    val isConnecting: Boolean = false,
    val isConnected: Boolean = false
)

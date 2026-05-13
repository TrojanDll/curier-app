package com.example.curier_mobile.presentation.serverconfig

/**
 * Состояние экрана «Подключение к серверу».
 *
 * [navigateTo] определяет, куда фрагмент должен сразу перейти, не показывая
 * форму ввода URL. Если в [com.example.curier_mobile.data.local.preferences.TokenManager]
 * лежит валидная пара токенов (`hasTokens()`), сессию можно восстановить
 * без логина — Authenticator обменяет refresh на свежий access при первом
 * 401.
 */
data class ServerConfigUiState(
    val url: String = "",
    val urlError: String? = null,
    val generalError: String? = null,
    val isConnecting: Boolean = false,
    val navigateTo: NavigationTarget? = null,
)

enum class NavigationTarget {
    LOGIN,
    MAIN,
}

package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.core.util.JwtUtils
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.dto.LoginRequest
import com.example.curier_mobile.data.remote.dto.LogoutRequest
import com.example.curier_mobile.data.remote.dto.RefreshTokenRequest
import com.example.curier_mobile.domain.model.User
import com.example.curier_mobile.domain.repository.AuthRepository

/**
 * Реализация AuthRepository поверх NestJS бэкенда (см. `docs/auth.md`).
 *
 * Бэк не отдаёт `expiresIn` — TTL вычисляется из JWT `exp` через
 * [JwtUtils]. Если декодирование fails, фоллбэчим на 15 минут.
 */
class AuthRepositoryImpl(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : AuthRepository {

    override suspend fun login(username: String, password: String): Result<User> {
        return try {
            val response = apiService.loginCourier(LoginRequest(username, password))
            val body = response.body()

            if (response.isSuccessful && body != null) {
                tokenManager.saveTokens(
                    accessToken = body.accessToken,
                    refreshToken = body.refreshToken,
                    expiresIn = JwtUtils.expiresInSeconds(body.accessToken)
                )
                Result.Success(body.user.toDomainModel())
            } else {
                Result.Error(Exception(errorMessage(response.code(), "Ошибка входа")))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun logout(): Result<Unit> {
        val refresh = tokenManager.getRefreshToken()
        return try {
            if (!refresh.isNullOrBlank()) {
                runCatching { apiService.logout(LogoutRequest(refresh)) }
            }
            tokenManager.clearTokens()
            Result.Success(Unit)
        } catch (e: Exception) {
            tokenManager.clearTokens()
            Result.Success(Unit)
        }
    }

    override suspend fun refreshToken(): Result<Unit> {
        val refresh = tokenManager.getRefreshToken()
            ?: return Result.Error(Exception("No refresh token available"))

        return try {
            val response = apiService.refreshToken(RefreshTokenRequest(refresh))
            val body = response.body()

            if (response.isSuccessful && body != null) {
                tokenManager.saveTokens(
                    accessToken = body.accessToken,
                    refreshToken = body.refreshToken,
                    expiresIn = JwtUtils.expiresInSeconds(body.accessToken)
                )
                Result.Success(Unit)
            } else {
                Result.Error(Exception(errorMessage(response.code(), "Ошибка обновления токена")))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override fun isLoggedIn(): Boolean = tokenManager.isLoggedIn()

    override fun getAccessToken(): String? = tokenManager.getAccessToken()

    private fun errorMessage(code: Int, fallback: String): String {
        return when (code) {
            401 -> "Неверный логин или пароль"
            403 -> "Доступ запрещён"
            else -> "$fallback (HTTP $code)"
        }
    }
}

package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.dto.LoginRequest
import com.example.curier_mobile.data.remote.dto.RefreshTokenRequest
import com.example.curier_mobile.data.remote.dto.RegisterRequest
import com.example.curier_mobile.domain.model.User
import com.example.curier_mobile.domain.repository.AuthRepository

/**
 * Implementation of AuthRepository
 * Handles authentication with API and token storage
 */
class AuthRepositoryImpl(
    private val apiService: ApiService,
    private val tokenManager: TokenManager
) : AuthRepository {

    override suspend fun register(
        username: String,
        password: String,
        fullName: String,
        phone: String
    ): Result<User> {
        return try {
            val response = apiService.register(
                RegisterRequest(
                    username = username,
                    password = password,
                    fullName = fullName,
                    phone = phone
                )
            )

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    // Save tokens
                    tokenManager.saveTokens(
                        accessToken = data.accessToken,
                        refreshToken = data.refreshToken,
                        expiresIn = data.expiresIn
                    )
                    Result.Success(data.courier.toDomainModel())
                } else {
                    Result.Error(Exception("Registration failed: No data received"))
                }
            } else {
                val message = response.body()?.message ?: "Registration failed"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun login(username: String, password: String): Result<User> {
        return try {
            val response = apiService.login(LoginRequest(username, password))

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    // Save tokens
                    tokenManager.saveTokens(
                        accessToken = data.accessToken,
                        refreshToken = data.refreshToken,
                        expiresIn = data.expiresIn
                    )
                    Result.Success(data.courier.toDomainModel())
                } else {
                    Result.Error(Exception("Login failed: No data received"))
                }
            } else {
                val message = response.body()?.message ?: "Login failed"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun logout(): Result<Unit> {
        return try {
            val response = apiService.logout()
            tokenManager.clearTokens()

            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Logout failed"))
            }
        } catch (e: Exception) {
            // Clear tokens even if network call fails
            tokenManager.clearTokens()
            Result.Success(Unit)
        }
    }

    override suspend fun refreshToken(): Result<Unit> {
        return try {
            val refreshToken = tokenManager.getRefreshToken()
                ?: return Result.Error(Exception("No refresh token available"))

            val response = apiService.refreshToken(RefreshTokenRequest(refreshToken))

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    tokenManager.saveTokens(
                        accessToken = data.accessToken,
                        refreshToken = data.refreshToken,
                        expiresIn = data.expiresIn
                    )
                    Result.Success(Unit)
                } else {
                    Result.Error(Exception("Token refresh failed: No data"))
                }
            } else {
                Result.Error(Exception("Token refresh failed"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override fun isLoggedIn(): Boolean {
        return tokenManager.isLoggedIn()
    }

    override fun getAccessToken(): String? {
        return tokenManager.getAccessToken()
    }
}

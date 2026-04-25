package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.User

/**
 * Repository interface for authentication operations
 * Domain layer doesn't depend on data layer implementation details
 */
interface AuthRepository {

    /**
     * Register new courier account
     * @return Result with User data on success
     */
    suspend fun register(
        username: String,
        password: String,
        fullName: String,
        phone: String
    ): Result<User>

    /**
     * Login with username and password
     * @return Result with User data on success
     */
    suspend fun login(username: String, password: String): Result<User>

    /**
     * Logout current user
     * @return Result with success flag
     */
    suspend fun logout(): Result<Unit>

    /**
     * Refresh access token
     * @return Result with success flag
     */
    suspend fun refreshToken(): Result<Unit>

    /**
     * Check if user is logged in
     */
    fun isLoggedIn(): Boolean

    /**
     * Get current access token
     */
    fun getAccessToken(): String?
}

package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.User

/**
 * Repository interface for authentication operations.
 *
 * Регистрация курьера не поддерживается — аккаунты создаёт админ
 * (см. `docs/couriers.md`).
 */
interface AuthRepository {

    suspend fun login(username: String, password: String): Result<User>

    suspend fun logout(): Result<Unit>

    suspend fun refreshToken(): Result<Unit>

    fun isLoggedIn(): Boolean

    fun getAccessToken(): String?
}

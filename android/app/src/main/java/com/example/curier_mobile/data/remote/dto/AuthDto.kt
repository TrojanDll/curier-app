package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.JsonClass

/**
 * Auth DTO — соответствует endpoint-ам NestJS бэкенда:
 * `POST /api/auth/courier/login`, `POST /api/auth/refresh`,
 * `POST /api/auth/logout`. См. `docs/auth.md`.
 *
 * Ответы — плоские объекты без обёртки `{ success, message, data }`.
 */

@JsonClass(generateAdapter = true)
data class LoginRequest(
    val username: String,
    val password: String
)

@JsonClass(generateAdapter = true)
data class LoginResponse(
    val accessToken: String,
    val refreshToken: String,
    val user: CourierProfileDto
)

@JsonClass(generateAdapter = true)
data class CourierProfileDto(
    val id: String,
    val username: String,
    val fullName: String,
    val email: String? = null,
    val phone: String? = null,
    val isActive: Boolean = true,
    val isPaused: Boolean = false
)

@JsonClass(generateAdapter = true)
data class RefreshTokenRequest(
    val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class RefreshTokenResponse(
    val accessToken: String,
    val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class LogoutRequest(
    val refreshToken: String
)

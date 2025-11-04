package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Authentication DTOs for login/logout/refresh
 */

@JsonClass(generateAdapter = true)
data class LoginRequest(
    @Json(name = "username")
    val username: String,

    @Json(name = "password")
    val password: String
)

@JsonClass(generateAdapter = true)
data class LoginResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: TokenData?
)

@JsonClass(generateAdapter = true)
data class TokenData(
    @Json(name = "access_token")
    val accessToken: String,

    @Json(name = "refresh_token")
    val refreshToken: String,

    @Json(name = "expires_in")
    val expiresIn: Long,

    @Json(name = "courier")
    val courier: CourierDto
)

@JsonClass(generateAdapter = true)
data class CourierDto(
    @Json(name = "id")
    val id: Long,

    @Json(name = "username")
    val username: String,

    @Json(name = "full_name")
    val fullName: String
)

@JsonClass(generateAdapter = true)
data class LogoutResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String
)

@JsonClass(generateAdapter = true)
data class RefreshTokenRequest(
    @Json(name = "refresh_token")
    val refreshToken: String
)

@JsonClass(generateAdapter = true)
data class RefreshTokenResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: TokenData?
)

package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Profile DTOs for getting and updating courier profile
 */

@JsonClass(generateAdapter = true)
data class ProfileResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: ProfileData?
)

@JsonClass(generateAdapter = true)
data class ProfileData(
    @Json(name = "id")
    val id: Long,

    @Json(name = "username")
    val username: String,

    @Json(name = "full_name")
    val fullName: String,

    @Json(name = "email")
    val email: String?,

    @Json(name = "phone")
    val phone: String?,

    @Json(name = "date_of_birth")
    val dateOfBirth: String? // ISO format: YYYY-MM-DD
)

@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    @Json(name = "email")
    val email: String?,

    @Json(name = "phone")
    val phone: String?,

    @Json(name = "date_of_birth")
    val dateOfBirth: String? // ISO format: YYYY-MM-DD
)

@JsonClass(generateAdapter = true)
data class UpdateProfileResponse(
    @Json(name = "success")
    val success: Boolean,

    @Json(name = "message")
    val message: String,

    @Json(name = "data")
    val data: ProfileData?
)

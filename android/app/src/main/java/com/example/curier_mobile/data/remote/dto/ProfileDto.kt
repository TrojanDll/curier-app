package com.example.curier_mobile.data.remote.dto

import com.squareup.moshi.JsonClass

/**
 * Profile DTO для `GET /api/courier/profile` (`CourierSelfResponse`).
 * См. `docs/couriers.md`.
 */
@JsonClass(generateAdapter = true)
data class ProfileDto(
    val id: String,
    val username: String,
    val fullName: String,
    val email: String? = null,
    val phone: String? = null,
    val dateOfBirth: String? = null,
    val isActive: Boolean = true,
    val isPaused: Boolean = false
)

/**
 * Body для `PUT /api/courier/profile`. По `UpdateProfileDto` (бэк) принимаются
 * только `email` и `phone`. `dateOfBirth` редактируется админом.
 */
@JsonClass(generateAdapter = true)
data class UpdateProfileRequest(
    val email: String? = null,
    val phone: String? = null
)

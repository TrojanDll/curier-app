package com.example.curier_mobile.domain.model

/**
 * Domain model for User (Courier)
 */
data class User(
    val id: Long,
    val username: String,
    val fullName: String,
    val email: String?,
    val phone: String?,
    val dateOfBirth: String? // ISO format: YYYY-MM-DD
)

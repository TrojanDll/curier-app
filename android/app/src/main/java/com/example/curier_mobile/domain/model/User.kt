package com.example.curier_mobile.domain.model

/**
 * Domain model for User (Courier).
 */
data class User(
    val id: String,
    val username: String,
    val fullName: String,
    val email: String?,
    val phone: String?,
    val dateOfBirth: String?,
    val isActive: Boolean,
    val isPaused: Boolean
)

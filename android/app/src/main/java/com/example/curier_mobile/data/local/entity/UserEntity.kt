package com.example.curier_mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity для кэширования профиля курьера.
 */
@Entity(tableName = "user")
data class UserEntity(
    @PrimaryKey
    val id: String,
    val username: String,
    val fullName: String,
    val email: String?,
    val phone: String?,
    val isActive: Boolean,
    val isPaused: Boolean
)

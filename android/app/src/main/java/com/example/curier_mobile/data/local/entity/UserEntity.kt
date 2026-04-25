package com.example.curier_mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for storing user (courier) data in local database
 * Cached from API for offline access
 */
@Entity(tableName = "user")
data class UserEntity(
    @PrimaryKey
    val id: Long,
    val username: String,
    val fullName: String,
    val email: String?,
    val phone: String?
)

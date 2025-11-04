package com.example.curier_mobile.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Entity для хранения данных пользователя в локальной БД
 */
@Entity(tableName = "user")
data class UserEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val email: String?,
    val phone: String,
    val updatedAt: Long
)

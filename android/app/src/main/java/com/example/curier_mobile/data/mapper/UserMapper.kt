package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.local.entity.UserEntity
import com.example.curier_mobile.data.remote.dto.CourierDto
import com.example.curier_mobile.data.remote.dto.ProfileData
import com.example.curier_mobile.domain.model.User

/**
 * Mappers for User conversions between layers:
 * - DTO (network) ↔ Domain Model
 * - Domain Model ↔ Entity (database)
 */

// ==================== DTO → Domain ====================

fun CourierDto.toDomainModel(): User {
    return User(
        id = id,
        username = username,
        fullName = fullName,
        email = null,
        phone = null,
        dateOfBirth = null
    )
}

fun ProfileData.toDomainModel(): User {
    return User(
        id = id,
        username = username,
        fullName = fullName,
        email = email,
        phone = phone,
        dateOfBirth = dateOfBirth
    )
}

// ==================== Domain → Entity ====================

fun User.toEntity(): UserEntity {
    return UserEntity(
        id = id,
        username = username,
        fullName = fullName,
        email = email,
        phone = phone
    )
}

// ==================== Entity → Domain ====================

fun UserEntity.toDomainModel(): User {
    return User(
        id = id,
        username = username,
        fullName = fullName,
        email = email,
        phone = phone,
        dateOfBirth = null // Entity doesn't store date of birth
    )
}

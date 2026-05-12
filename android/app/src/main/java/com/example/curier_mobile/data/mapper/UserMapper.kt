package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.local.entity.UserEntity
import com.example.curier_mobile.data.remote.dto.CourierProfileDto
import com.example.curier_mobile.data.remote.dto.ProfileDto
import com.example.curier_mobile.domain.model.User

// ==================== DTO → Domain ====================

fun CourierProfileDto.toDomainModel(): User {
    return User(
        id = id,
        username = username,
        fullName = fullName,
        email = email,
        phone = phone,
        dateOfBirth = null,
        isActive = isActive,
        isPaused = isPaused
    )
}

fun ProfileDto.toDomainModel(): User {
    return User(
        id = id,
        username = username,
        fullName = fullName,
        email = email,
        phone = phone,
        dateOfBirth = dateOfBirth,
        isActive = isActive,
        isPaused = isPaused
    )
}

// ==================== Domain → Entity ====================

fun User.toEntity(): UserEntity {
    return UserEntity(
        id = id,
        username = username,
        fullName = fullName,
        email = email,
        phone = phone,
        isActive = isActive,
        isPaused = isPaused
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
        dateOfBirth = null,
        isActive = isActive,
        isPaused = isPaused
    )
}

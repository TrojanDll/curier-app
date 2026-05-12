package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.User

interface ProfileRepository {

    suspend fun getProfile(): Result<User>

    /**
     * Бэкенд (см. `docs/couriers.md`) принимает только `email` + `phone` —
     * `dateOfBirth` редактирует админ.
     */
    suspend fun updateProfile(
        email: String?,
        phone: String?
    ): Result<User>
}

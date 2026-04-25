package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.User

/**
 * Repository interface for profile operations
 */
interface ProfileRepository {

    /**
     * Get courier profile
     * @return Result with User data
     */
    suspend fun getProfile(): Result<User>

    /**
     * Update courier profile
     * @param email New email (optional)
     * @param phone New phone (optional)
     * @param dateOfBirth New date of birth in ISO format YYYY-MM-DD (optional)
     * @return Result with updated User data
     */
    suspend fun updateProfile(
        email: String?,
        phone: String?,
        dateOfBirth: String?
    ): Result<User>
}

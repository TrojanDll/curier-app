package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.dao.UserDao
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.mapper.toEntity
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.dto.UpdateProfileRequest
import com.example.curier_mobile.domain.model.User
import com.example.curier_mobile.domain.repository.ProfileRepository

/**
 * Implementation of ProfileRepository
 * Handles profile operations with API and local caching
 */
class ProfileRepositoryImpl(
    private val apiService: ApiService,
    private val userDao: UserDao
) : ProfileRepository {

    override suspend fun getProfile(): Result<User> {
        return try {
            val response = apiService.getProfile()

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val user = data.toDomainModel()
                    // Cache profile in database
                    userDao.insertUser(user.toEntity())
                    Result.Success(user)
                } else {
                    Result.Error(Exception("Profile fetch failed: No data received"))
                }
            } else {
                val message = response.body()?.message ?: "Profile fetch failed"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun updateProfile(
        email: String?,
        phone: String?,
        dateOfBirth: String?
    ): Result<User> {
        return try {
            val request = UpdateProfileRequest(
                email = email,
                phone = phone,
                dateOfBirth = dateOfBirth
            )
            val response = apiService.updateProfile(request)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val user = data.toDomainModel()
                    // Update cached profile in database
                    userDao.insertUser(user.toEntity())
                    Result.Success(user)
                } else {
                    Result.Error(Exception("Profile update failed: No data received"))
                }
            } else {
                val message = response.body()?.message ?: "Profile update failed"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

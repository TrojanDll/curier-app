package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.dao.UserDao
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.mapper.toEntity
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.dto.UpdateProfileRequest
import com.example.curier_mobile.domain.model.User
import com.example.curier_mobile.domain.repository.ProfileRepository

class ProfileRepositoryImpl(
    private val apiService: ApiService,
    private val userDao: UserDao
) : ProfileRepository {

    override suspend fun getProfile(): Result<User> {
        return try {
            val response = apiService.getProfile()
            val body = response.body()

            if (response.isSuccessful && body != null) {
                val user = body.toDomainModel()
                userDao.insertUser(user.toEntity())
                Result.Success(user)
            } else {
                Result.Error(Exception("Не удалось загрузить профиль (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun updateProfile(
        email: String?,
        phone: String?
    ): Result<User> {
        return try {
            val response = apiService.updateProfile(
                UpdateProfileRequest(email = email, phone = phone)
            )
            val body = response.body()

            if (response.isSuccessful && body != null) {
                val user = body.toDomainModel()
                userDao.insertUser(user.toEntity())
                Result.Success(user)
            } else {
                Result.Error(Exception("Не удалось обновить профиль (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

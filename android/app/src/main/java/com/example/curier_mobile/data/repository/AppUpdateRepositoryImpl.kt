package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.domain.model.AppUpdateInfo
import com.example.curier_mobile.domain.repository.AppUpdateRepository

class AppUpdateRepositoryImpl(
    private val apiService: ApiService
) : AppUpdateRepository {

    override suspend fun getLatestVersion(): Result<AppUpdateInfo?> {
        return try {
            val response = apiService.getLatestVersion()
            if (response.isSuccessful) {
                // 204 (релизов нет) → body == null → Success(null).
                Result.Success(response.body()?.toDomainModel())
            } else {
                Result.Error(Exception("Не удалось проверить обновление (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

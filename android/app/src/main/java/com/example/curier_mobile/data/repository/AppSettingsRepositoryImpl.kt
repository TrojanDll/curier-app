package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.domain.model.AppSettings
import com.example.curier_mobile.domain.repository.AppSettingsRepository

class AppSettingsRepositoryImpl(
    private val apiService: ApiService
) : AppSettingsRepository {

    override suspend fun getSettings(): Result<AppSettings> {
        return try {
            val response = apiService.getAppSettings()
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.Success(body.toDomainModel())
            } else {
                Result.Error(Exception("Не удалось загрузить настройки (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.mapper.toAppUpdateInfo
import com.example.curier_mobile.data.remote.api.GithubApiService
import com.example.curier_mobile.domain.model.AppUpdateInfo
import com.example.curier_mobile.domain.repository.AppUpdateRepository

class AppUpdateRepositoryImpl(
    private val githubApiService: GithubApiService,
) : AppUpdateRepository {

    override suspend fun getLatestVersion(): Result<AppUpdateInfo?> {
        return try {
            val response = githubApiService.getLatestRelease()
            when {
                response.isSuccessful -> Result.Success(response.body()?.toAppUpdateInfo())
                // 404 → в репозитории ещё нет ни одного релиза, обновлять не на что.
                response.code() == 404 -> Result.Success(null)
                else -> Result.Error(
                    Exception("Не удалось проверить обновление (HTTP ${response.code()})"),
                )
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

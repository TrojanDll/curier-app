package com.example.curier_mobile.data.remote.api

import com.example.curier_mobile.data.remote.dto.GithubReleaseDto
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Headers

/**
 * Публичный GitHub Releases API open-source репозитория проекта. Отдельный от
 * [ApiService] клиент (см. `NetworkModule.provideGithubApiService`): baseUrl
 * `https://api.github.com/`, без JWT-интерсептора — чужой Bearer GitHub
 * отверг бы как 401 даже на публичном эндпоинте.
 */
interface GithubApiService {

    @GET("repos/TrojanDll/curier-app/releases/latest")
    @Headers("Accept: application/vnd.github+json")
    suspend fun getLatestRelease(): Response<GithubReleaseDto>
}

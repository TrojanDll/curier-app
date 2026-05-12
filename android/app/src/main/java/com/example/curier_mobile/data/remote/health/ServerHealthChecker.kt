package com.example.curier_mobile.data.remote.health

import com.example.curier_mobile.core.result.Result
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Проверяет, что по заданному BASE_URL действительно живёт наш backend.
 *
 * Отдельный standalone-helper — намеренно не использует [com.example.curier_mobile.core.di.NetworkModule],
 * чтобы не модифицировать его глобальный кэш Retrofit/OkHttpClient до того, как пользователь
 * подтвердит ввод URL.
 *
 * Backend выставляет `GET /health` (вне `/api` префикса), ответ — 200 OK с
 * телом `{"status":"ok"}`. См. `docs/observability.md`.
 */
class ServerHealthChecker {

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()

    suspend fun check(baseUrl: String): Result<Unit> = withContext(Dispatchers.IO) {
        val normalized = baseUrl.trim().trimEnd('/')
        val healthUrl = "$normalized/health"

        val request = try {
            Request.Builder().url(healthUrl).get().build()
        } catch (e: IllegalArgumentException) {
            return@withContext Result.Error(IllegalArgumentException("Некорректный URL", e))
        }

        try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Result.Success(Unit)
                } else {
                    Result.Error(IOException("Сервер ответил ${response.code}"))
                }
            }
        } catch (e: IOException) {
            Result.Error(e)
        }
    }

    companion object {
        private const val CONNECT_TIMEOUT_SECONDS = 5L
        private const val READ_TIMEOUT_SECONDS = 5L
    }
}

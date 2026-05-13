package com.example.curier_mobile.core.di

import android.content.Context
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.dto.RefreshTokenRequest
import com.example.curier_mobile.data.remote.dto.RefreshTokenResponse
import com.example.curier_mobile.data.remote.interceptor.AuthInterceptor
import com.example.curier_mobile.data.remote.interceptor.TokenAuthenticator
import com.example.curier_mobile.data.remote.realtime.RealtimeManager
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Simple singleton DI for Network dependencies.
 *
 * BASE_URL загружается из [ServerConfigManager] (runtime-конфиг). Если URL не задан,
 * используется заглушка `http://0.0.0.0/` — Retrofit построится, но запросы упадут,
 * пока пользователь не введёт URL на экране «Подключение к серверу».
 */
object NetworkModule {

    private const val TIMEOUT_SECONDS = 30L
    private const val PLACEHOLDER_BASE_URL = "http://0.0.0.0/"

    private var tokenManager: TokenManager? = null
    private var serverConfigManager: ServerConfigManager? = null
    private var moshi: Moshi? = null
    private var okHttpClient: OkHttpClient? = null
    private var retrofit: Retrofit? = null
    private var apiService: ApiService? = null
    private var realtimeManager: RealtimeManager? = null
    private var cachedBaseUrl: String? = null

    fun initialize(context: Context) {
        tokenManager = TokenManager.getInstance(context)
        serverConfigManager = ServerConfigManager.getInstance(context)
        moshi = provideMoshi()
        realtimeManager = RealtimeManager(
            serverConfigManager = serverConfigManager!!,
            tokenManager = tokenManager!!,
            moshi = moshi!!
        )
    }

    /**
     * Сбрасывает сетевой стек после смены BASE_URL: закрывает realtime-сокет
     * и обнуляет Retrofit/OkHttp/ApiService. Realtime-инстанс пересоздавать
     * не нужно — он сам читает текущий URL из [ServerConfigManager] при connect.
     */
    @Synchronized
    fun resetClients() {
        realtimeManager?.disconnect()
        retrofit = null
        okHttpClient = null
        apiService = null
        cachedBaseUrl = null
    }

    private fun provideMoshi(): Moshi {
        return Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    private fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

    private fun provideAuthInterceptor(): AuthInterceptor {
        return AuthInterceptor(
            tokenProvider = { tokenManager?.getAccessToken() }
        )
    }

    /**
     * Authenticator, который ловит 401 на любом запросе и прозрачно
     * обменивает refresh-токен на свежий access. Refresh-вызов идёт через
     * отдельный bare-OkHttp (`refreshHttpCall`), чтобы не словить
     * бесконечную рекурсию через тот же Authenticator/Interceptor.
     */
    private fun provideTokenAuthenticator(): TokenAuthenticator {
        return TokenAuthenticator(
            tokenManager = tokenManager
                ?: throw IllegalStateException("NetworkModule not initialized"),
            refreshTokens = { refreshToken -> refreshHttpCall(refreshToken) },
            onTokensRefreshed = {
                // Realtime-сокет был открыт со старым access; форсим reconnect
                // с новым. Сам менеджер тихо вернётся, если URL/токен пусты.
                realtimeManager?.reconnectWithCurrentCredentials()
            },
        )
    }

    /**
     * Прямой blocking-вызов `POST /api/auth/refresh` через отдельный OkHttp
     * без интерсепторов и без Authenticator-а. Используется только из
     * [TokenAuthenticator] — на основной стек нельзя, иначе при истёкшем
     * access любой запрос (включая сам refresh) попал бы в Authenticator
     * → ещё refresh → бесконечный цикл.
     */
    private fun refreshHttpCall(refreshToken: String): RefreshTokenResponse? {
        val baseUrl = serverConfigManager?.getBaseUrl()?.trimEnd('/') ?: return null
        val moshi = this.moshi ?: provideMoshi()
        val requestAdapter = moshi.adapter(RefreshTokenRequest::class.java)
        val responseAdapter = moshi.adapter(RefreshTokenResponse::class.java)

        val client = OkHttpClient.Builder()
            .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build()
        val body = requestAdapter.toJson(RefreshTokenRequest(refreshToken))
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$baseUrl/api/auth/refresh")
            .post(body)
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                response.body?.string()?.let(responseAdapter::fromJson)
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun provideOkHttpClient(): OkHttpClient {
        return okHttpClient ?: synchronized(this) {
            okHttpClient ?: OkHttpClient.Builder()
                .addInterceptor(provideAuthInterceptor())
                .authenticator(provideTokenAuthenticator())
                .addInterceptor(provideLoggingInterceptor())
                .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .build()
                .also { okHttpClient = it }
        }
    }

    private fun provideRetrofit(): Retrofit {
        val baseUrl = serverConfigManager?.getBaseUrl() ?: PLACEHOLDER_BASE_URL
        val cached = retrofit
        if (cached != null && cachedBaseUrl == baseUrl) return cached

        return synchronized(this) {
            val current = retrofit
            if (current != null && cachedBaseUrl == baseUrl) {
                current
            } else {
                Retrofit.Builder()
                    .baseUrl(baseUrl)
                    .client(provideOkHttpClient())
                    .addConverterFactory(MoshiConverterFactory.create(moshi ?: provideMoshi()))
                    .build()
                    .also {
                        retrofit = it
                        cachedBaseUrl = baseUrl
                        apiService = null
                    }
            }
        }
    }

    fun provideApiService(): ApiService {
        return apiService ?: synchronized(this) {
            apiService ?: provideRetrofit().create(ApiService::class.java)
                .also { apiService = it }
        }
    }

    fun provideTokenManager(): TokenManager {
        return tokenManager
            ?: throw IllegalStateException("NetworkModule not initialized. Call initialize(context) first.")
    }

    fun provideServerConfigManager(): ServerConfigManager {
        return serverConfigManager
            ?: throw IllegalStateException("NetworkModule not initialized. Call initialize(context) first.")
    }

    fun provideRealtimeManager(): RealtimeManager {
        return realtimeManager
            ?: throw IllegalStateException("NetworkModule not initialized. Call initialize(context) first.")
    }
}

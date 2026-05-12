package com.example.curier_mobile.core.di

import android.content.Context
import com.example.curier_mobile.data.local.preferences.ServerConfigManager
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.interceptor.AuthInterceptor
import com.example.curier_mobile.data.remote.realtime.RealtimeManager
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
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

    private fun provideOkHttpClient(): OkHttpClient {
        return okHttpClient ?: synchronized(this) {
            okHttpClient ?: OkHttpClient.Builder()
                .addInterceptor(provideAuthInterceptor())
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

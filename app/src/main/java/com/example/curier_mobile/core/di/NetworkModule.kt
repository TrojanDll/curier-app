package com.example.curier_mobile.core.di

import android.content.Context
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.interceptor.AuthInterceptor
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Simple singleton DI for Network dependencies
 * Replaces Hilt NetworkModule
 */
object NetworkModule {

    private const val BASE_URL = "https://api.example.com/" // TODO: Replace with actual API URL
    private const val TIMEOUT_SECONDS = 30L

    private var tokenManager: TokenManager? = null
    private var okHttpClient: OkHttpClient? = null
    private var retrofit: Retrofit? = null
    private var apiService: ApiService? = null

    /**
     * Initialize NetworkModule with application context
     * Call this from Application.onCreate()
     */
    fun initialize(context: Context) {
        tokenManager = TokenManager.getInstance(context)
    }

    /**
     * Provide Moshi JSON converter
     */
    private fun provideMoshi(): Moshi {
        return Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()
    }

    /**
     * Provide HttpLoggingInterceptor
     */
    private fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }

    /**
     * Provide AuthInterceptor
     */
    private fun provideAuthInterceptor(): AuthInterceptor {
        return AuthInterceptor(
            tokenProvider = { tokenManager?.getAccessToken() }
        )
    }

    /**
     * Provide OkHttpClient
     */
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

    /**
     * Provide Retrofit instance
     */
    private fun provideRetrofit(): Retrofit {
        return retrofit ?: synchronized(this) {
            retrofit ?: Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(provideOkHttpClient())
                .addConverterFactory(MoshiConverterFactory.create(provideMoshi()))
                .build()
                .also { retrofit = it }
        }
    }

    /**
     * Provide ApiService
     */
    fun provideApiService(): ApiService {
        return apiService ?: synchronized(this) {
            apiService ?: provideRetrofit().create(ApiService::class.java)
                .also { apiService = it }
        }
    }

    /**
     * Get TokenManager instance
     */
    fun provideTokenManager(): TokenManager {
        return tokenManager
            ?: throw IllegalStateException("NetworkModule not initialized. Call initialize(context) first.")
    }
}

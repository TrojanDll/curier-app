package com.example.curier_mobile.core.di

import com.example.curier_mobile.data.repository.AppSettingsRepositoryImpl
import com.example.curier_mobile.data.repository.AppUpdateRepositoryImpl
import com.example.curier_mobile.data.repository.AuthRepositoryImpl
import com.example.curier_mobile.data.repository.OrderRepositoryImpl
import com.example.curier_mobile.data.repository.ProfileRepositoryImpl
import com.example.curier_mobile.domain.repository.AppSettingsRepository
import com.example.curier_mobile.domain.repository.AppUpdateRepository
import com.example.curier_mobile.domain.repository.AuthRepository
import com.example.curier_mobile.domain.repository.OrderRepository
import com.example.curier_mobile.domain.repository.ProfileRepository

/**
 * Simple singleton DI for Repository dependencies
 * Provides repository implementations
 */
object RepositoryModule {

    private var authRepository: AuthRepository? = null
    private var profileRepository: ProfileRepository? = null
    private var orderRepository: OrderRepository? = null
    private var appSettingsRepository: AppSettingsRepository? = null
    private var appUpdateRepository: AppUpdateRepository? = null

    /**
     * Сбросить кэш репозиториев. Вызывать после смены BASE_URL, чтобы
     * repositories пересоздались с новым ApiService.
     */
    @Synchronized
    fun resetCache() {
        authRepository = null
        profileRepository = null
        orderRepository = null
        appSettingsRepository = null
        appUpdateRepository = null
    }

    /**
     * Provide AuthRepository
     */
    fun provideAuthRepository(): AuthRepository {
        return authRepository ?: synchronized(this) {
            authRepository ?: AuthRepositoryImpl(
                apiService = NetworkModule.provideApiService(),
                tokenManager = NetworkModule.provideTokenManager(),
                realtimeManager = NetworkModule.provideRealtimeManager()
            ).also { authRepository = it }
        }
    }

    /**
     * Provide ProfileRepository
     */
    fun provideProfileRepository(): ProfileRepository {
        return profileRepository ?: synchronized(this) {
            profileRepository ?: ProfileRepositoryImpl(
                apiService = NetworkModule.provideApiService(),
                userDao = DatabaseModule.provideUserDao()
            ).also { profileRepository = it }
        }
    }

    /**
     * Provide OrderRepository
     */
    fun provideOrderRepository(): OrderRepository {
        return orderRepository ?: synchronized(this) {
            orderRepository ?: OrderRepositoryImpl(
                apiService = NetworkModule.provideApiService(),
                orderDao = DatabaseModule.provideOrderDao()
            ).also { orderRepository = it }
        }
    }

    /**
     * Provide AppSettingsRepository (§7.8). Хранит read-only снимок настроек
     * курьеру; mutations происходят только в админке.
     */
    fun provideAppSettingsRepository(): AppSettingsRepository {
        return appSettingsRepository ?: synchronized(this) {
            appSettingsRepository ?: AppSettingsRepositoryImpl(
                apiService = NetworkModule.provideApiService()
            ).also { appSettingsRepository = it }
        }
    }

    /**
     * Provide AppUpdateRepository — проверка последней версии приложения через
     * GitHub Releases (in-app обновление). Не зависит от настройки сервера.
     */
    fun provideAppUpdateRepository(): AppUpdateRepository {
        return appUpdateRepository ?: synchronized(this) {
            appUpdateRepository ?: AppUpdateRepositoryImpl(
                githubApiService = NetworkModule.provideGithubApiService()
            ).also { appUpdateRepository = it }
        }
    }
}

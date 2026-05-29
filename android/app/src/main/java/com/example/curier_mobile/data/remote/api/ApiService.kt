package com.example.curier_mobile.data.remote.api

import com.example.curier_mobile.data.remote.dto.AppSettingsDto
import com.example.curier_mobile.data.remote.dto.AppVersionDto
import com.example.curier_mobile.data.remote.dto.LoginRequest
import com.example.curier_mobile.data.remote.dto.LoginResponse
import com.example.curier_mobile.data.remote.dto.LogoutRequest
import com.example.curier_mobile.data.remote.dto.OrderDto
import com.example.curier_mobile.data.remote.dto.PhotoMetaDto
import com.example.curier_mobile.data.remote.dto.ProfileDto
import com.example.curier_mobile.data.remote.dto.RefreshTokenRequest
import com.example.curier_mobile.data.remote.dto.RefreshTokenResponse
import com.example.curier_mobile.data.remote.dto.StatisticsDto
import com.example.curier_mobile.data.remote.dto.UpdateProfileRequest
import com.example.curier_mobile.data.remote.dto.UpdateStatusRequest
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit интерфейс под NestJS бэкенд. Все ответы — плоские DTO без
 * обёрток (см. соответствующие документы в `docs/`).
 */
interface ApiService {

    // ==================== Authentication ====================

    @POST("api/auth/courier/login")
    suspend fun loginCourier(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    @POST("api/auth/logout")
    suspend fun logout(@Body request: LogoutRequest): Response<Unit>

    // ==================== Profile ====================

    @GET("api/courier/profile")
    suspend fun getProfile(): Response<ProfileDto>

    @PUT("api/courier/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ProfileDto>

    // ==================== Orders ====================

    @GET("api/courier/orders/active")
    suspend fun getActiveOrders(): Response<List<OrderDto>>

    /**
     * `from` / `to` — ISO 8601 timestamps (опционально, дефолты на бэке).
     */
    @GET("api/courier/orders/history")
    suspend fun getOrderHistory(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<List<OrderDto>>

    @GET("api/courier/orders/{id}")
    suspend fun getOrderById(@Path("id") orderId: String): Response<OrderDto>

    @PUT("api/courier/orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: String,
        @Body request: UpdateStatusRequest
    ): Response<OrderDto>

    // ==================== Photo ====================

    @Multipart
    @POST("api/courier/orders/{id}/photo")
    suspend fun uploadPhoto(
        @Path("id") orderId: String,
        @Part photo: MultipartBody.Part
    ): Response<PhotoMetaDto>

    // ==================== Statistics ====================

    /**
     * `period` — `24h` / `7d` / `30d` (по умолчанию `24h`). `from`/`to`
     * перекрывают named-период если оба заданы. См. `docs/statistics.md`.
     */
    @GET("api/courier/statistics")
    suspend fun getStatistics(
        @Query("period") period: String? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): Response<StatisticsDto>

    // ==================== App settings (courier read-only) ====================

    /**
     * Подмножество админских настроек для информационных блоков на Profile
     * (§7.8): TTL фото и контакт поддержки. См. `docs/settings.md`.
     */
    @GET("api/courier/settings")
    suspend fun getAppSettings(): Response<AppSettingsDto>

    // ==================== App update (public, no auth) ====================

    /**
     * Последняя опубликованная версия приложения. Публичный эндпоинт —
     * проверка обновления работает и до логина. 204 → релизов нет (body null).
     */
    @GET("api/app/latest")
    suspend fun getLatestVersion(): Response<AppVersionDto>
}

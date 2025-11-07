package com.example.curier_mobile.data.remote.api

import com.example.curier_mobile.data.remote.dto.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API service for backend communication
 * All endpoints return Response<T> for manual error handling
 */
interface ApiService {

    // ==================== Authentication ====================

    /**
     * Register new courier account
     * POST /api/auth/register
     */
    @POST("api/auth/register")
    suspend fun register(
        @Body request: RegisterRequest
    ): Response<RegisterResponse>

    /**
     * Login courier and receive access token
     * POST /api/auth/login
     */
    @POST("api/auth/login")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    /**
     * Logout current session
     * POST /api/auth/logout
     */
    @POST("api/auth/logout")
    suspend fun logout(): Response<LogoutResponse>

    /**
     * Refresh access token using refresh token
     * POST /api/auth/refresh
     */
    @POST("api/auth/refresh")
    suspend fun refreshToken(
        @Body request: RefreshTokenRequest
    ): Response<RefreshTokenResponse>

    // ==================== Profile ====================

    /**
     * Get courier profile information
     * GET /api/courier/profile
     */
    @GET("api/courier/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    /**
     * Update courier profile settings
     * PUT /api/courier/profile
     */
    @PUT("api/courier/profile")
    suspend fun updateProfile(
        @Body request: UpdateProfileRequest
    ): Response<UpdateProfileResponse>

    // ==================== Orders ====================

    /**
     * Get list of active orders for authenticated courier
     * GET /api/courier/orders/active
     */
    @GET("api/courier/orders/active")
    suspend fun getActiveOrders(): Response<OrdersResponse>

    /**
     * Get completed orders history for time period
     * GET /api/courier/orders/history
     * @param startDate ISO 8601 timestamp (default: 24h ago)
     * @param endDate ISO 8601 timestamp (default: now)
     */
    @GET("api/courier/orders/history")
    suspend fun getOrderHistory(
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): Response<OrdersResponse>

    /**
     * Get detailed information for specific order
     * GET /api/courier/orders/{id}
     */
    @GET("api/courier/orders/{id}")
    suspend fun getOrderById(
        @Path("id") orderId: Long
    ): Response<OrderResponse>

    /**
     * Update order status
     * PUT /api/courier/orders/{id}/status
     */
    @PUT("api/courier/orders/{id}/status")
    suspend fun updateOrderStatus(
        @Path("id") orderId: Long,
        @Body request: UpdateStatusRequest
    ): Response<UpdateStatusResponse>

    // ==================== Photo ====================

    /**
     * Upload delivery proof photo
     * POST /api/courier/orders/{id}/photo
     * Multipart upload with "photo" field
     */
    @Multipart
    @POST("api/courier/orders/{id}/photo")
    suspend fun uploadPhoto(
        @Path("id") orderId: Long,
        @Part photo: MultipartBody.Part
    ): Response<PhotoUploadResponse>

    // ==================== Statistics ====================

    /**
     * Get courier delivery statistics for time period
     * GET /api/courier/statistics
     * @param startDate ISO 8601 timestamp (default: 24h ago)
     * @param endDate ISO 8601 timestamp (default: now)
     */
    @GET("api/courier/statistics")
    suspend fun getStatistics(
        @Query("start_date") startDate: String? = null,
        @Query("end_date") endDate: String? = null
    ): Response<StatisticsResponse>
}

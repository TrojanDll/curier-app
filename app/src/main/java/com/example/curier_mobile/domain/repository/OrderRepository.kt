package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.model.Statistics
import kotlinx.coroutines.flow.Flow
import java.io.File

/**
 * Repository interface for order operations
 */
interface OrderRepository {

    /**
     * Get active orders (Flow for real-time updates)
     * @return Flow of list of active orders
     */
    fun getActiveOrdersFlow(): Flow<List<Order>>

    /**
     * Get active orders (single fetch)
     * @return Result with list of active orders
     */
    suspend fun getActiveOrders(): Result<List<Order>>

    /**
     * Get order history for time period
     * @param startDate ISO 8601 timestamp (optional, default: 24h ago)
     * @param endDate ISO 8601 timestamp (optional, default: now)
     * @return Result with list of completed orders
     */
    suspend fun getOrderHistory(
        startDate: String? = null,
        endDate: String? = null
    ): Result<List<Order>>

    /**
     * Get order by ID
     * @param orderId Order ID
     * @return Result with Order details
     */
    suspend fun getOrderById(orderId: Long): Result<Order>

    /**
     * Update order status
     * @param orderId Order ID
     * @param newStatus New order status
     * @return Result with updated Order
     */
    suspend fun updateOrderStatus(
        orderId: Long,
        newStatus: OrderStatus
    ): Result<Order>

    /**
     * Upload delivery proof photo
     * @param orderId Order ID
     * @param photoFile Photo file
     * @return Result with photo URL
     */
    suspend fun uploadPhoto(
        orderId: Long,
        photoFile: File
    ): Result<String>

    /**
     * Get delivery statistics
     * @param startDate ISO 8601 timestamp (optional, default: 24h ago)
     * @param endDate ISO 8601 timestamp (optional, default: now)
     * @return Result with Statistics
     */
    suspend fun getStatistics(
        startDate: String? = null,
        endDate: String? = null
    ): Result<Statistics>
}

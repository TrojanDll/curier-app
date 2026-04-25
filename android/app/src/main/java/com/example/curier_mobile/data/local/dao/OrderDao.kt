package com.example.curier_mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.curier_mobile.data.local.entity.OrderEntity
import kotlinx.coroutines.flow.Flow

/**
 * DAO for Order operations
 * Provides reactive Flow-based queries for UI updates
 */
@Dao
interface OrderDao {

    /**
     * Get active orders (not completed yet)
     * Orders with status other than "returned" are considered active
     */
    @Query("SELECT * FROM orders WHERE status != 'returned' ORDER BY assignedAt DESC")
    fun getActiveOrders(): Flow<List<OrderEntity>>

    /**
     * Get order history (completed orders)
     * Orders with status "returned" are considered completed
     */
    @Query("SELECT * FROM orders WHERE status = 'returned' ORDER BY completedAt DESC LIMIT :limit")
    fun getOrderHistory(limit: Int = 100): Flow<List<OrderEntity>>

    /**
     * Get order by ID
     */
    @Query("SELECT * FROM orders WHERE id = :orderId")
    suspend fun getOrderById(orderId: Long): OrderEntity?

    /**
     * Insert or update multiple orders
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrders(orders: List<OrderEntity>)

    /**
     * Insert or update single order
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    /**
     * Clear all orders from database
     */
    @Query("DELETE FROM orders")
    suspend fun clearOrders()
}

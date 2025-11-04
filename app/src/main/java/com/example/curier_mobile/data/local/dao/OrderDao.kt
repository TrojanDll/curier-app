package com.example.curier_mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.curier_mobile.data.local.entity.OrderEntity
import kotlinx.coroutines.flow.Flow

/**
 * DAO для работы с заказами
 */
@Dao
interface OrderDao {

    @Query("SELECT * FROM orders WHERE status != 'DELIVERED' AND status != 'RETURNED_TO_BASE' ORDER BY assignedAt DESC")
    fun getActiveOrders(): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE status = 'DELIVERED' OR status = 'RETURNED_TO_BASE' ORDER BY updatedAt DESC LIMIT :limit")
    fun getOrderHistory(limit: Int = 100): Flow<List<OrderEntity>>

    @Query("SELECT * FROM orders WHERE id = :orderId")
    suspend fun getOrderById(orderId: String): OrderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrders(orders: List<OrderEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    @Query("DELETE FROM orders")
    suspend fun clearOrders()
}

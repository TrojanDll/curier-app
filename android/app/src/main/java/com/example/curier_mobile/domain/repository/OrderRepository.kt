package com.example.curier_mobile.domain.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.model.Photo
import com.example.curier_mobile.domain.model.Statistics
import kotlinx.coroutines.flow.Flow
import java.io.File

interface OrderRepository {

    fun getActiveOrdersFlow(): Flow<List<Order>>

    suspend fun getActiveOrders(): Result<List<Order>>

    /**
     * `from` / `to` — ISO 8601 timestamps. Бэк применяет дефолтное окно,
     * если оба не заданы (см. `docs/orders.md`).
     */
    suspend fun getOrderHistory(
        from: String? = null,
        to: String? = null
    ): Result<List<Order>>

    suspend fun getOrderById(orderId: String): Result<Order>

    suspend fun updateOrderStatus(
        orderId: String,
        newStatus: OrderStatus
    ): Result<Order>

    /**
     * Возвращает метаданные загруженной фотографии (id + timestamps).
     * Сами байты выдаются отдельным защищённым endpoint-ом.
     */
    suspend fun uploadPhoto(
        orderId: String,
        photoFile: File
    ): Result<Photo>

    /**
     * `period` — `24h` / `7d` / `30d`; `from`/`to` перекрывают named-период.
     */
    suspend fun getStatistics(
        period: String? = null,
        from: String? = null,
        to: String? = null
    ): Result<Statistics>
}

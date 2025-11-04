package com.example.curier_mobile.data.repository

import com.example.curier_mobile.core.result.Result
import com.example.curier_mobile.data.local.dao.OrderDao
import com.example.curier_mobile.data.mapper.toDomainModel
import com.example.curier_mobile.data.mapper.toDomainModels
import com.example.curier_mobile.data.mapper.toEntity
import com.example.curier_mobile.data.remote.api.ApiService
import com.example.curier_mobile.data.remote.dto.UpdateStatusRequest
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus
import com.example.curier_mobile.domain.model.Statistics
import com.example.curier_mobile.domain.repository.OrderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Implementation of OrderRepository
 * Handles order operations with API and local caching
 * Implements offline-first approach with Flow for real-time updates
 */
class OrderRepositoryImpl(
    private val apiService: ApiService,
    private val orderDao: OrderDao
) : OrderRepository {

    override fun getActiveOrdersFlow(): Flow<List<Order>> {
        return orderDao.getActiveOrders().map { entities ->
            entities.toDomainModels()
        }
    }

    override suspend fun getActiveOrders(): Result<List<Order>> {
        return try {
            val response = apiService.getActiveOrders()

            if (response.isSuccessful && response.body()?.success == true) {
                val orders = response.body()?.data ?: emptyList()
                val domainOrders = orders.toDomainModels()

                // Cache orders in database
                val entities = domainOrders.map { it.toEntity() }
                orderDao.insertOrders(entities)

                Result.Success(domainOrders)
            } else {
                val message = response.body()?.message ?: "Failed to fetch active orders"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun getOrderHistory(
        startDate: String?,
        endDate: String?
    ): Result<List<Order>> {
        return try {
            val response = apiService.getOrderHistory(startDate, endDate)

            if (response.isSuccessful && response.body()?.success == true) {
                val orders = response.body()?.data ?: emptyList()
                val domainOrders = orders.toDomainModels()

                // Cache history orders in database
                val entities = domainOrders.map { it.toEntity() }
                orderDao.insertOrders(entities)

                Result.Success(domainOrders)
            } else {
                val message = response.body()?.message ?: "Failed to fetch order history"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun getOrderById(orderId: Long): Result<Order> {
        return try {
            val response = apiService.getOrderById(orderId)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val order = data.toDomainModel()
                    // Cache order in database
                    orderDao.insertOrder(order.toEntity())
                    Result.Success(order)
                } else {
                    Result.Error(Exception("Order not found"))
                }
            } else {
                val message = response.body()?.message ?: "Failed to fetch order"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun updateOrderStatus(
        orderId: Long,
        newStatus: OrderStatus
    ): Result<Order> {
        return try {
            // Validate status transition
            val currentOrder = orderDao.getOrderById(orderId)
            if (currentOrder != null) {
                val currentStatus = OrderStatus.fromValue(currentOrder.status)
                if (!OrderStatus.isValidTransition(currentStatus, newStatus)) {
                    return Result.Error(
                        Exception("Invalid status transition: ${currentStatus.displayName} → ${newStatus.displayName}")
                    )
                }
            }

            val request = UpdateStatusRequest(
                status = newStatus.value,
                timestamp = getCurrentIsoTimestamp()
            )
            val response = apiService.updateOrderStatus(orderId, request)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val order = data.toDomainModel()
                    // Update order in database
                    orderDao.insertOrder(order.toEntity())
                    Result.Success(order)
                } else {
                    Result.Error(Exception("Order status update failed: No data received"))
                }
            } else {
                val message = response.body()?.message ?: "Order status update failed"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun uploadPhoto(
        orderId: Long,
        photoFile: File
    ): Result<String> {
        return try {
            if (!photoFile.exists()) {
                return Result.Error(Exception("Photo file does not exist"))
            }

            val requestBody = photoFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
            val photoPart = MultipartBody.Part.createFormData(
                "photo",
                photoFile.name,
                requestBody
            )

            val response = apiService.uploadPhoto(orderId, photoPart)

            if (response.isSuccessful && response.body()?.success == true) {
                val photoUrl = response.body()?.data?.photoUrl
                if (photoUrl != null) {
                    Result.Success(photoUrl)
                } else {
                    Result.Error(Exception("Photo upload failed: No URL received"))
                }
            } else {
                val message = response.body()?.message ?: "Photo upload failed"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun getStatistics(
        startDate: String?,
        endDate: String?
    ): Result<Statistics> {
        return try {
            val response = apiService.getStatistics(startDate, endDate)

            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val statistics = data.toDomainModel()
                    Result.Success(statistics)
                } else {
                    Result.Error(Exception("Statistics fetch failed: No data received"))
                }
            } else {
                val message = response.body()?.message ?: "Statistics fetch failed"
                Result.Error(Exception(message))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    /**
     * Get current timestamp in ISO 8601 format
     * Compatible with API level 24+
     */
    private fun getCurrentIsoTimestamp(): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        dateFormat.timeZone = TimeZone.getTimeZone("UTC")
        return dateFormat.format(Date())
    }
}

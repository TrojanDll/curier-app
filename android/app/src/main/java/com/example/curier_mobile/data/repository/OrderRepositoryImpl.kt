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
import com.example.curier_mobile.domain.model.Photo
import com.example.curier_mobile.domain.model.Statistics
import com.example.curier_mobile.domain.repository.OrderRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

class OrderRepositoryImpl(
    private val apiService: ApiService,
    private val orderDao: OrderDao
) : OrderRepository {

    override suspend fun cacheOrder(order: Order) {
        orderDao.insertOrder(order.toEntity())
    }

    override fun getActiveOrdersFlow(): Flow<List<Order>> {
        return orderDao.getActiveOrders().map { entities ->
            entities.toDomainModels()
        }
    }

    override suspend fun getActiveOrders(): Result<List<Order>> {
        return try {
            val response = apiService.getActiveOrders()
            val body = response.body()

            if (response.isSuccessful && body != null) {
                val domainOrders = body.toDomainModels()
                orderDao.insertOrders(domainOrders.map { it.toEntity() })
                Result.Success(domainOrders)
            } else {
                Result.Error(Exception("Не удалось загрузить активные заказы (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun getOrderHistory(
        from: String?,
        to: String?
    ): Result<List<Order>> {
        return try {
            val response = apiService.getOrderHistory(from, to)
            val body = response.body()

            if (response.isSuccessful && body != null) {
                val domainOrders = body.toDomainModels()
                orderDao.insertOrders(domainOrders.map { it.toEntity() })
                Result.Success(domainOrders)
            } else {
                Result.Error(Exception("Не удалось загрузить историю (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun getOrderById(orderId: String): Result<Order> {
        return try {
            val response = apiService.getOrderById(orderId)
            val body = response.body()

            if (response.isSuccessful && body != null) {
                val order = body.toDomainModel()
                orderDao.insertOrder(order.toEntity())
                Result.Success(order)
            } else {
                Result.Error(Exception("Заказ не найден (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun updateOrderStatus(
        orderId: String,
        newStatus: OrderStatus
    ): Result<Order> {
        return try {
            val cached = orderDao.getOrderById(orderId)
            if (cached != null) {
                val currentStatus = OrderStatus.fromValue(cached.status)
                if (!OrderStatus.isValidTransition(currentStatus, newStatus)) {
                    return Result.Error(
                        Exception("Недопустимый переход: ${currentStatus.displayName} → ${newStatus.displayName}")
                    )
                }
            }

            val response = apiService.updateOrderStatus(orderId, UpdateStatusRequest(newStatus.value))
            val body = response.body()

            if (response.isSuccessful && body != null) {
                val order = body.toDomainModel()
                orderDao.insertOrder(order.toEntity())
                Result.Success(order)
            } else {
                Result.Error(Exception("Не удалось обновить статус (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun uploadPhoto(
        orderId: String,
        photoFile: File
    ): Result<Photo> {
        return try {
            if (!photoFile.exists()) {
                return Result.Error(Exception("Файл фотографии не существует"))
            }

            val requestBody = photoFile.asRequestBody("image/jpeg".toMediaTypeOrNull())
            val photoPart = MultipartBody.Part.createFormData(
                "photo",
                photoFile.name,
                requestBody
            )

            val response = apiService.uploadPhoto(orderId, photoPart)
            val body = response.body()

            if (response.isSuccessful && body != null) {
                Result.Success(
                    Photo(
                        id = body.id,
                        uploadedAt = body.uploadedAt,
                        expiresAt = body.expiresAt
                    )
                )
            } else {
                Result.Error(Exception("Не удалось загрузить фото (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun getStatistics(
        period: String?,
        from: String?,
        to: String?
    ): Result<Statistics> {
        return try {
            val response = apiService.getStatistics(period, from, to)
            val body = response.body()

            if (response.isSuccessful && body != null) {
                Result.Success(body.toDomainModel())
            } else {
                Result.Error(Exception("Не удалось загрузить статистику (HTTP ${response.code()})"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

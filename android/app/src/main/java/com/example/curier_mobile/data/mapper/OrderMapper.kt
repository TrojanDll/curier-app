package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.local.entity.OrderEntity
import com.example.curier_mobile.data.remote.dto.OrderDto
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderStatus

/**
 * Mappers for Order conversions between layers:
 * - DTO (network) ↔ Domain Model
 * - Domain Model ↔ Entity (database)
 */

// ==================== DTO → Domain ====================

fun OrderDto.toDomainModel(): Order {
    // Backend uses "notes" field, but we map it to comments
    val finalComments = notes ?: comments
    val finalProductDescription = productDescription ?: "Товар"

    return Order(
        id = id,
        orderNumber = orderNumber,
        customerName = customerName,
        customerPhone = customerPhone,
        deliveryAddress = deliveryAddress,
        productDescription = finalProductDescription,
        comments = finalComments,
        status = OrderStatus.fromValue(status),
        statusUpdatedAt = statusUpdatedAt ?: updatedAt,
        assignedAt = assignedAt,
        completedAt = completedAt,
        photoUrl = photoUrl
    )
}

@JvmName("orderDtoListToDomainModels")
fun List<OrderDto>.toDomainModels(): List<Order> {
    return map { it.toDomainModel() }
}

// ==================== Domain → Entity ====================

fun Order.toEntity(): OrderEntity {
    return OrderEntity(
        id = id,
        orderNumber = orderNumber,
        customerName = customerName,
        customerPhone = customerPhone,
        deliveryAddress = deliveryAddress,
        productDescription = productDescription,
        comments = comments,
        status = status.value,
        statusUpdatedAt = statusUpdatedAt,
        assignedAt = assignedAt,
        completedAt = completedAt
    )
}

// ==================== Entity → Domain ====================

fun OrderEntity.toDomainModel(): Order {
    return Order(
        id = id,
        orderNumber = orderNumber,
        customerName = customerName,
        customerPhone = customerPhone,
        deliveryAddress = deliveryAddress,
        productDescription = productDescription,
        comments = comments,
        status = OrderStatus.fromValue(status),
        statusUpdatedAt = statusUpdatedAt,
        assignedAt = assignedAt,
        completedAt = completedAt,
        photoUrl = null // Entity doesn't store photo URL
    )
}

@JvmName("orderEntityListToDomainModels")
fun List<OrderEntity>.toDomainModels(): List<Order> {
    return map { it.toDomainModel() }
}

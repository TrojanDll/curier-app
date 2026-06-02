package com.example.curier_mobile.data.mapper

import com.example.curier_mobile.data.local.entity.OrderEntity
import com.example.curier_mobile.data.remote.dto.OrderDto
import com.example.curier_mobile.domain.model.Order
import com.example.curier_mobile.domain.model.OrderPriority
import com.example.curier_mobile.domain.model.OrderStatus

// ==================== DTO → Domain ====================

fun OrderDto.toDomainModel(): Order {
    return Order(
        id = id,
        orderNumber = orderNumber,
        customerName = customerName,
        customerPhone = customerPhone,
        deliveryAddress = deliveryAddress,
        productDescription = productDescription,
        comments = comments,
        status = OrderStatus.fromValue(status),
        priority = OrderPriority.fromValue(priority),
        courierId = courierId,
        createdAt = createdAt,
        assignedAt = assignedAt,
        pickedUpAt = pickedUpAt,
        nearCustomerAt = nearCustomerAt,
        deliveredAt = deliveredAt,
        returnedAt = returnedAt,
        cancelledAt = cancelledAt,
        cancellationReason = cancellationReason,
        photos = photos.map { it.toDomainModel() }
    )
}

@JvmName("orderDtoListToDomainModels")
fun List<OrderDto>.toDomainModels(): List<Order> = map { it.toDomainModel() }

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
        priority = priority.value,
        courierId = courierId,
        createdAt = createdAt,
        assignedAt = assignedAt,
        pickedUpAt = pickedUpAt,
        nearCustomerAt = nearCustomerAt,
        deliveredAt = deliveredAt,
        returnedAt = returnedAt,
        cancelledAt = cancelledAt,
        cancellationReason = cancellationReason
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
        priority = OrderPriority.fromValue(priority),
        courierId = courierId,
        createdAt = createdAt,
        assignedAt = assignedAt,
        pickedUpAt = pickedUpAt,
        nearCustomerAt = nearCustomerAt,
        deliveredAt = deliveredAt,
        returnedAt = returnedAt,
        cancelledAt = cancelledAt,
        cancellationReason = cancellationReason,
        photos = emptyList()
    )
}

@JvmName("orderEntityListToDomainModels")
fun List<OrderEntity>.toDomainModels(): List<Order> = map { it.toDomainModel() }

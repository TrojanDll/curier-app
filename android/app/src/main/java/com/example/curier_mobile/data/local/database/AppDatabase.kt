package com.example.curier_mobile.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.curier_mobile.data.local.dao.OrderDao
import com.example.curier_mobile.data.local.dao.UserDao
import com.example.curier_mobile.data.local.entity.OrderEntity
import com.example.curier_mobile.data.local.entity.UserEntity

/**
 * Главная база данных приложения
 */
@Database(
    entities = [
        OrderEntity::class,
        UserEntity::class
    ],
    // v4: OrderEntity.priority (см. docs/assignment.md). Кэш заказов
    // пересоздаётся через fallbackToDestructiveMigration — потеря кэша
    // безопасна, активные заказы перезагружаются с бэка при следующем fetch.
    version = 4,
    exportSchema = false
)
// @TypeConverters(Converters::class) - будет добавлено при необходимости конвертации сложных типов
abstract class AppDatabase : RoomDatabase() {
    abstract fun orderDao(): OrderDao
    abstract fun userDao(): UserDao
}

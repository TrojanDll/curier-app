package com.example.curier_mobile.data.local.database

import androidx.room.TypeConverter

/**
 * Конвертеры для Room Database
 */
class Converters {

    @TypeConverter
    fun fromTimestamp(value: Long?): Long? {
        return value
    }

    @TypeConverter
    fun dateToTimestamp(date: Long?): Long? {
        return date
    }
}

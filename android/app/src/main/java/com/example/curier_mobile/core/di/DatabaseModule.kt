package com.example.curier_mobile.core.di

import android.content.Context
import androidx.room.Room
import com.example.curier_mobile.data.local.dao.OrderDao
import com.example.curier_mobile.data.local.dao.UserDao
import com.example.curier_mobile.data.local.database.AppDatabase

/**
 * Simple singleton DI for Database dependencies
 * Replaces Hilt DatabaseModule
 */
object DatabaseModule {

    private const val DATABASE_NAME = "curier_database"

    private var database: AppDatabase? = null

    /**
     * Initialize DatabaseModule with application context
     * Call this from Application.onCreate()
     */
    fun initialize(context: Context) {
        database = Room.databaseBuilder(
            context.applicationContext,
            AppDatabase::class.java,
            DATABASE_NAME
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    /**
     * Provide AppDatabase instance
     */
    fun provideDatabase(): AppDatabase {
        return database
            ?: throw IllegalStateException("DatabaseModule not initialized. Call initialize(context) first.")
    }

    /**
     * Provide OrderDao
     */
    fun provideOrderDao(): OrderDao {
        return provideDatabase().orderDao()
    }

    /**
     * Provide UserDao
     */
    fun provideUserDao(): UserDao {
        return provideDatabase().userDao()
    }
}

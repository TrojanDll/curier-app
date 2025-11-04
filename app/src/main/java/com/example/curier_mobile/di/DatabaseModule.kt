package com.example.curier_mobile.di

import android.content.Context
import androidx.room.Room
import com.example.curier_mobile.data.local.database.AppDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Модуль Hilt для предоставления зависимостей базы данных
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    private const val DATABASE_NAME = "curier_database"

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            DATABASE_NAME
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideOrderDao(database: AppDatabase) = database.orderDao()

    @Provides
    @Singleton
    fun provideUserDao(database: AppDatabase) = database.userDao()
}

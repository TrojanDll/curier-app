package com.example.curier_mobile.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.curier_mobile.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

/**
 * DAO для работы с данными пользователя
 */
@Dao
interface UserDao {

    @Query("SELECT * FROM user LIMIT 1")
    fun getUser(): Flow<UserEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)

    @Query("DELETE FROM user")
    suspend fun clearUser()
}

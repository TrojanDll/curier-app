package com.example.curier_mobile.data.local.preferences

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure token storage using EncryptedSharedPreferences
 * Stores access token, refresh token, and expiration time
 * Falls back to regular SharedPreferences if encryption is not available
 */
class TokenManager(context: Context) {

    private val sharedPreferences: SharedPreferences = try {
        // Try to create encrypted SharedPreferences
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ).also {
            Log.d(TAG, "Using EncryptedSharedPreferences")
        }
    } catch (e: Exception) {
        // Fallback to regular SharedPreferences if encryption fails
        Log.e(TAG, "Failed to create EncryptedSharedPreferences, falling back to regular SharedPreferences", e)
        context.getSharedPreferences(PREFS_NAME_FALLBACK, Context.MODE_PRIVATE)
    }

    /**
     * Save authentication tokens
     */
    fun saveTokens(accessToken: String, refreshToken: String, expiresIn: Long) {
        val expirationTime = System.currentTimeMillis() + (expiresIn * 1000)
        sharedPreferences.edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            putLong(KEY_EXPIRATION_TIME, expirationTime)
            apply()
        }
    }

    /**
     * Get current access token
     */
    fun getAccessToken(): String? {
        return sharedPreferences.getString(KEY_ACCESS_TOKEN, null)
    }

    /**
     * Get refresh token
     */
    fun getRefreshToken(): String? {
        return sharedPreferences.getString(KEY_REFRESH_TOKEN, null)
    }

    /**
     * Check if token is expired
     */
    fun isTokenExpired(): Boolean {
        val expirationTime = sharedPreferences.getLong(KEY_EXPIRATION_TIME, 0)
        return System.currentTimeMillis() >= expirationTime
    }

    /**
     * Check if user is logged in (has valid token)
     */
    fun isLoggedIn(): Boolean {
        val token = getAccessToken()
        return !token.isNullOrEmpty() && !isTokenExpired()
    }

    /**
     * Есть ли в хранилище полная пара токенов (access + refresh) — независимо
     * от того, протух access или нет. Используется при старте приложения,
     * чтобы решить «можно ли восстановить сессию без логина»: даже если
     * access-токен уже истёк, refresh ещё валиден ~30 дней и
     * [TokenAuthenticator] прозрачно обменяет его на свежий access на
     * первом 401.
     */
    fun hasTokens(): Boolean {
        return !getAccessToken().isNullOrEmpty() && !getRefreshToken().isNullOrEmpty()
    }

    /**
     * Clear all tokens (logout)
     */
    fun clearTokens() {
        sharedPreferences.edit().clear().apply()
    }

    companion object {
        private const val TAG = "TokenManager"
        private const val PREFS_NAME = "curier_secure_prefs"
        private const val PREFS_NAME_FALLBACK = "curier_prefs"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_EXPIRATION_TIME = "expiration_time"

        @Volatile
        private var instance: TokenManager? = null

        /**
         * Get singleton instance of TokenManager
         */
        fun getInstance(context: Context): TokenManager {
            return instance ?: synchronized(this) {
                instance ?: TokenManager(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
}

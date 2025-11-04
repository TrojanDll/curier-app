package com.example.curier_mobile.data.local.preferences

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure token storage using EncryptedSharedPreferences
 * Stores access token, refresh token, and expiration time
 */
class TokenManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

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
     * Clear all tokens (logout)
     */
    fun clearTokens() {
        sharedPreferences.edit().clear().apply()
    }

    companion object {
        private const val PREFS_NAME = "curier_secure_prefs"
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

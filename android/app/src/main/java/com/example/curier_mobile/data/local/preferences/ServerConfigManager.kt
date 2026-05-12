package com.example.curier_mobile.data.local.preferences

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Хранилище runtime-настроек подключения к серверу (BASE_URL).
 *
 * URL вводится пользователем на экране «Подключение к серверу» при первом запуске
 * и хранится в EncryptedSharedPreferences (с fallback на обычные prefs, как в [TokenManager]).
 */
class ServerConfigManager(context: Context) {

    private val sharedPreferences: SharedPreferences = try {
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
        Log.e(TAG, "Failed to create EncryptedSharedPreferences, falling back to regular SharedPreferences", e)
        context.getSharedPreferences(PREFS_NAME_FALLBACK, Context.MODE_PRIVATE)
    }

    /**
     * Сохранить BASE_URL. URL приводится к виду с trailing slash —
     * именно такой формат ожидает Retrofit.
     */
    fun saveBaseUrl(url: String) {
        val normalized = normalize(url)
        sharedPreferences.edit()
            .putString(KEY_BASE_URL, normalized)
            .apply()
    }

    /**
     * Получить сохранённый BASE_URL или `null`, если не задан.
     */
    fun getBaseUrl(): String? {
        return sharedPreferences.getString(KEY_BASE_URL, null)?.takeIf { it.isNotBlank() }
    }

    /**
     * Проверить, что BASE_URL задан.
     */
    fun hasBaseUrl(): Boolean = !getBaseUrl().isNullOrBlank()

    /**
     * Сбросить сохранённый BASE_URL.
     */
    fun clearBaseUrl() {
        sharedPreferences.edit().remove(KEY_BASE_URL).apply()
    }

    private fun normalize(url: String): String {
        val trimmed = url.trim()
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }

    companion object {
        private const val TAG = "ServerConfigManager"
        private const val PREFS_NAME = "curier_server_config_secure"
        private const val PREFS_NAME_FALLBACK = "curier_server_config"
        private const val KEY_BASE_URL = "base_url"

        @Volatile
        private var instance: ServerConfigManager? = null

        fun getInstance(context: Context): ServerConfigManager {
            return instance ?: synchronized(this) {
                instance ?: ServerConfigManager(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
}

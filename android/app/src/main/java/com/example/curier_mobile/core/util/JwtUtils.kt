package com.example.curier_mobile.core.util

import android.util.Base64
import org.json.JSONObject

/**
 * Helpers для работы с JWT access-token-ом.
 *
 * Бэкенд не возвращает `expiresIn` в `LoginResponse`, поэтому TTL берём
 * напрямую из claim `exp` (epoch seconds, UTC). Если decode неудачен —
 * возвращаем fallback (15 минут — совпадает с дефолтом
 * `JWT_ACCESS_TTL` бэка, см. `docs/auth.md`).
 */
object JwtUtils {

    private const val FALLBACK_TTL_SECONDS = 15 * 60L

    fun expiresInSeconds(accessToken: String): Long {
        val exp = expiryEpochSeconds(accessToken) ?: return FALLBACK_TTL_SECONDS
        val nowSeconds = System.currentTimeMillis() / 1000
        val delta = exp - nowSeconds
        return if (delta > 0) delta else FALLBACK_TTL_SECONDS
    }

    private fun expiryEpochSeconds(accessToken: String): Long? {
        return try {
            val parts = accessToken.split(".")
            if (parts.size < 2) return null
            val payloadBytes = Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
            val payload = JSONObject(String(payloadBytes, Charsets.UTF_8))
            payload.optLong("exp", 0L).takeIf { it > 0L }
        } catch (e: Exception) {
            null
        }
    }
}

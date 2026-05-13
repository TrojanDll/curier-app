package com.example.curier_mobile.data.remote.interceptor

import android.util.Log
import com.example.curier_mobile.core.util.JwtUtils
import com.example.curier_mobile.data.local.preferences.TokenManager
import com.example.curier_mobile.data.remote.dto.RefreshTokenResponse
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * OkHttp [Authenticator] для прозрачного восстановления сессии при 401.
 *
 * Backend ставит access-JWT TTL = 15 минут, refresh = 30 дней. Курьер
 * рассчитывает, что один раз залогинился — и приложение работает «вечно».
 * Без этого Authenticator-а после 15 минут любой REST-запрос отваливался бы
 * с 401, и UI выкидывал курьера на экран логина.
 *
 * Flow при 401:
 *  1. Извлекаем `Authorization` от исходного запроса — если его не было,
 *     значит это не auth-flow (логин/refresh уже идут без интерсептора), и
 *     ретрай бессмыслен → возвращаем null.
 *  2. Под `synchronized` проверяем, не успел ли другой параллельный запрос
 *     уже обновить токен (тогда Bearer изменился) — просто ретраим с новым.
 *  3. Иначе зовём [refreshTokens] (lambda с blocking-вызовом `/api/auth/refresh`
 *     через bare-OkHttp без интерсепторов — иначе словим бесконечную
 *     рекурсию через этот же Authenticator).
 *  4. Успех → сохраняем токены, дёргаем [onTokensRefreshed] для realtime
 *     reconnect, ретраим оригинальный запрос с новым Bearer.
 *  5. Провал → очищаем токены (сессия не подлежит восстановлению), отдаём
 *     null — OkHttp прокинет 401 наверх, UI отрисует «требуется вход».
 *
 * Возврат `null` из `authenticate` означает «отдай 401 клиенту» и НЕ
 * генерирует бесконечный цикл — OkHttp прекращает попытки сразу после
 * первого null.
 */
class TokenAuthenticator(
    private val tokenManager: TokenManager,
    private val refreshTokens: (refreshToken: String) -> RefreshTokenResponse?,
    private val onTokensRefreshed: () -> Unit = {},
) : Authenticator {

    private val refreshLock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        val originalRequest = response.request
        val sentBearer = originalRequest.header(AUTH_HEADER) ?: return null

        synchronized(refreshLock) {
            // Если параллельный запрос уже обновил access — в TokenManager
            // лежит новый. Сравниваем то, что отправляли мы, с тем, что есть
            // сейчас: если различаются, чужой refresh уже отработал — просто
            // ретраим с актуальным.
            val currentAccess = tokenManager.getAccessToken()
            val currentBearer = currentAccess?.let { "Bearer $it" }
            if (currentBearer != null && currentBearer != sentBearer) {
                return originalRequest.newBuilder()
                    .header(AUTH_HEADER, currentBearer)
                    .build()
            }

            val refreshToken = tokenManager.getRefreshToken()
            if (refreshToken.isNullOrBlank()) {
                Log.w(TAG, "401 received but no refresh token stored — giving up")
                return null
            }

            val refreshed = try {
                refreshTokens(refreshToken)
            } catch (e: Exception) {
                Log.w(TAG, "Refresh request failed", e)
                null
            }

            if (refreshed == null) {
                Log.w(TAG, "Refresh denied by server — clearing session")
                tokenManager.clearTokens()
                return null
            }

            tokenManager.saveTokens(
                accessToken = refreshed.accessToken,
                refreshToken = refreshed.refreshToken,
                expiresIn = JwtUtils.expiresInSeconds(refreshed.accessToken),
            )
            onTokensRefreshed()

            return originalRequest.newBuilder()
                .header(AUTH_HEADER, "Bearer ${refreshed.accessToken}")
                .build()
        }
    }

    companion object {
        private const val TAG = "TokenAuthenticator"
        private const val AUTH_HEADER = "Authorization"
    }
}

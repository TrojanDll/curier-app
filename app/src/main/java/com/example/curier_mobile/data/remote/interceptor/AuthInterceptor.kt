package com.example.curier_mobile.data.remote.interceptor

import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor that adds Authorization header to requests
 * Token is retrieved from TokenManager
 */
class AuthInterceptor(
    private val tokenProvider: () -> String?
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Skip adding token for login and refresh endpoints
        val path = originalRequest.url.encodedPath
        if (path.contains("/auth/login") || path.contains("/auth/refresh")) {
            return chain.proceed(originalRequest)
        }

        // Add Authorization header if token exists
        val token = tokenProvider()
        val newRequest = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(newRequest)
    }
}

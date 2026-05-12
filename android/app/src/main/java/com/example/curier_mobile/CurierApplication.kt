package com.example.curier_mobile

import android.app.Application
import android.util.Log
import com.example.curier_mobile.core.di.DatabaseModule
import com.example.curier_mobile.core.di.NetworkModule

/**
 * Main application class.
 * Initializes DI modules (Network, Database) and reconnects realtime
 * socket if a valid token survives a restart.
 */
class CurierApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        NetworkModule.initialize(this)
        Log.d(TAG, "NetworkModule initialized")

        DatabaseModule.initialize(this)
        Log.d(TAG, "DatabaseModule initialized")

        // Если токен ещё валиден (после рестарта приложения) — пытаемся
        // сразу поднять realtime. Сам менеджер тихо вернётся, если URL
        // или токен пусты.
        if (NetworkModule.provideTokenManager().isLoggedIn()) {
            NetworkModule.provideRealtimeManager().connect()
        }
    }

    companion object {
        private const val TAG = "CurierApplication"
    }
}

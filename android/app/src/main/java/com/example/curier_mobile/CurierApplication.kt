package com.example.curier_mobile

import android.app.Application
import android.util.Log
import com.example.curier_mobile.core.di.DatabaseModule
import com.example.curier_mobile.core.di.NetworkModule
import com.example.curier_mobile.core.notification.NewOrderNotifier
import com.example.curier_mobile.core.notification.OrderNotificationManager

/**
 * Main application class.
 *
 * Инициализирует DI-модули (Network, Database), регистрирует канал
 * системных уведомлений и подписывает app-scoped observer на realtime,
 * чтобы heads-up уведомления о новых заказах работали независимо от
 * того, какой фрагмент сейчас активен (и даже когда приложение в фоне,
 * пока процесс жив).
 *
 * Если в [TokenManager] лежит валидная пара токенов, сразу поднимает
 * realtime — это даёт «холодный» старт без логина и без ожидания, пока
 * пользователь дойдёт до экрана заказов.
 */
class CurierApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        NetworkModule.initialize(this)
        Log.d(TAG, "NetworkModule initialized")

        DatabaseModule.initialize(this)
        Log.d(TAG, "DatabaseModule initialized")

        // Системный канал уведомлений + app-level observer realtime-событий.
        // Канал нужен раньше, чем мы попробуем что-то отправить через notifier.
        val notificationManager = OrderNotificationManager(this)
        notificationManager.ensureChannel()
        NewOrderNotifier(
            realtimeManager = NetworkModule.provideRealtimeManager(),
            notificationManager = notificationManager,
        ).start()

        // Если у нас есть полная пара токенов (даже с истёкшим access),
        // realtime можно поднимать сразу — TokenAuthenticator в первый же
        // 401 подменит access. Так heads-up уведомления о новых заказах
        // приходят даже до того, как пользователь откроет приложение.
        if (NetworkModule.provideTokenManager().hasTokens()) {
            NetworkModule.provideRealtimeManager().connect()
        }
    }

    companion object {
        private const val TAG = "CurierApplication"
    }
}

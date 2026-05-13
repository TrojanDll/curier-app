package com.example.curier_mobile.core.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.curier_mobile.MainActivity
import com.example.curier_mobile.R
import com.example.curier_mobile.domain.model.Order

/**
 * Системные уведомления о новых заказах.
 *
 * Канал создаётся один раз в [CurierApplication.onCreate] и живёт до
 * деинсталляции приложения (importance/sound правки на лету Android не
 * подхватывает — для переопределения нужно либо новый channel id, либо
 * uninstall/install). Поэтому канал сконфигурирован сразу с
 * `IMPORTANCE_HIGH` + default-звуком + вибрацией: на API 26+ это даёт
 * heads-up даже когда приложение открыто, без дополнительных трюков.
 *
 * Тап по нотификации открывает приложение через [MainActivity]. Глубокий
 * линк до конкретного заказа сейчас не делаем — `nav_graph_main` требует
 * предварительной авторизации, а после restore-session мы окажемся на
 * списке заказов, где новый заказ уже виден сверху.
 */
class OrderNotificationManager(private val context: Context) {

    private val systemNotifier: NotificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    /**
     * Создаёт канал «Новые заказы». Безопасно вызывать многократно —
     * `createNotificationChannel` идемпотентен по `id`.
     */
    fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val name = context.getString(R.string.notification_channel_new_orders)
        val description = context.getString(R.string.notification_channel_new_orders_desc)
        val channel = NotificationChannel(
            CHANNEL_ID_NEW_ORDERS,
            name,
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            this.description = description
            enableLights(true)
            enableVibration(true)
            // Системный звук уведомления + AudioAttributes-USAGE_NOTIFICATION —
            // важно, чтобы звук играл даже когда телефон в режиме «без звука
            // от приложений», но всё ещё уважал общую тишину/«не беспокоить».
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttrs = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()
            setSound(soundUri, audioAttrs)
        }
        systemNotifier.createNotificationChannel(channel)
    }

    /**
     * Постит heads-up уведомление о новом заказе. Идентификатор уведомления
     * — стабильный хеш `order.id`, чтобы повторные события про тот же заказ
     * (re-assign, повторное emit при reconnect) перезаписали ту же
     * нотификацию, а не плодили дубликаты.
     */
    fun notifyNewOrder(order: Order) {
        val title = context.getString(R.string.notification_new_order_title)
        val body = context.getString(
            R.string.notification_new_order_body,
            order.orderNumber,
            order.deliveryAddress.ifBlank { "—" },
        )

        val tapIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        // FLAG_IMMUTABLE — обязательное требование Android 12+, иначе
        // PendingIntent.getActivity бросит IllegalArgumentException.
        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pendingIntent = PendingIntent.getActivity(context, 0, tapIntent, pendingFlags)

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_NEW_ORDERS)
            // smallIcon обязателен. ic_launcher не идеален визуально, но
            // отдельный mono-иконки в проекте пока нет — заменим в §7.x.
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH) // pre-O fallback
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_ALL) // звук + вибрация на pre-O
            .build()

        val notifier = NotificationManagerCompat.from(context)
        try {
            notifier.notify(order.id.stableHashId(), notification)
        } catch (e: SecurityException) {
            // POST_NOTIFICATIONS отозван пользователем на Android 13+. Нет
            // смысла валить процесс — следующий новый заказ просто не
            // позвенит, но REST/realtime данные продолжат идти в UI.
        }
    }

    private fun String.stableHashId(): Int {
        // hashCode на UUID-строке стабилен между процессами одной JVM-версии.
        // Маскируем знак, чтобы система notification id видела положительный
        // int — отрицательные тоже валидны, но удобнее в логах.
        return hashCode() and 0x7FFFFFFF
    }

    companion object {
        const val CHANNEL_ID_NEW_ORDERS = "orders_new"
    }
}

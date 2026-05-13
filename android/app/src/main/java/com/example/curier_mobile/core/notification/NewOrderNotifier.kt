package com.example.curier_mobile.core.notification

import com.example.curier_mobile.data.remote.realtime.RealtimeEvent
import com.example.curier_mobile.data.remote.realtime.RealtimeManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch
import kotlinx.coroutines.plus

/**
 * Слушает [RealtimeManager.events] на уровне приложения и постит системную
 * нотификацию при каждом `OrderAssigned`. Существует параллельно с
 * UI-консьюмерами (OrdersViewModel и т.п.) — фрагменты получают своё
 * событие в репозитории, а пользователь — heads-up + звук, даже если
 * приложение свернуто или открыт неподходящий экран.
 *
 * `OrderReassigned` сейчас тихий: с точки зрения курьера это либо
 * «приехал новый заказ от админа» (тогда тоже звенит, но мы пока не
 * различаем сценарий «к нам пришёл» от «от нас ушёл»), либо «у нас
 * заказ забрали» — и звенеть точно не надо. Когда realtime payload
 * подскажет direction, добавим отдельную нотификацию.
 */
class NewOrderNotifier(
    private val realtimeManager: RealtimeManager,
    private val notificationManager: OrderNotificationManager,
) {

    private var scope: CoroutineScope? = null

    /**
     * Запускает coroutine, который живёт до `stop()` или до завершения
     * процесса. Безопасно вызывать повторно — идемпотентен через проверку
     * `scope != null`.
     */
    fun start() {
        if (scope != null) return
        val newScope = CoroutineScope(Dispatchers.Main.immediate + SupervisorJob())
        scope = newScope

        newScope.launch {
            realtimeManager.events
                .filterIsInstance<RealtimeEvent.OrderAssigned>()
                .collect { event ->
                    notificationManager.notifyNewOrder(event.order)
                }
        }
    }

    /** Останавливает observer. На практике вызывается только в тестах. */
    fun stop() {
        scope?.cancel()
        scope = null
    }
}

package com.example.curier_mobile.data.remote.realtime

import com.example.curier_mobile.domain.model.Order

/**
 * События, которые реалтайм-канал доставляет курьеру.
 *
 * См. `docs/realtime.md` — namespace `/realtime`, room `courier:<id>`.
 */
sealed class RealtimeEvent {
    /**
     * `orders:new` — auto-assign или queue-drainer назначил новый заказ
     * этому курьеру. `photos` всегда `[]` (см. `docs/realtime.md`),
     * полные метаданные курьер получает только при открытии деталей.
     */
    data class OrderAssigned(val order: Order) : RealtimeEvent()

    /**
     * `orders:reassigned` — администратор переназначил заказ. Событие
     * приходит и предыдущему, и новому курьеру, поэтому слушающий
     * ViewModel сам решает, как обновить кэш (новый владелец — добавить,
     * прежний — убрать).
     */
    data class OrderReassigned(val order: Order) : RealtimeEvent()
}

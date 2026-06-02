import {
    ORDER_PRIORITY_LABELS,
    ORDER_STATUS_LABELS,
    type OrderPriority,
    type OrderStatus,
} from "@/types/order";
import { COURIER_STATUS_LABELS, type CourierDisplayStatus } from "@/types/courier";
import { cx } from "@/utils/cx";

/**
 * Цвета бэйджей статусов заказа. `delivered` и `returned` имеют одинаковую
 * зелёную палитру: для админа оба означают «заказ доставлен» (см. соседний
 * `ORDER_STATUS_LABELS` в `@/types/order`). Различие двух состояний по-прежнему
 * хранится в БД и отражается в timeline-секции drawer-а заказа.
 */
const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
    new: "bg-utility-blue-50 text-utility-blue-700 ring-utility-blue-200",
    assigned: "bg-utility-purple-50 text-utility-purple-700 ring-utility-purple-200",
    picked_up: "bg-utility-indigo-50 text-utility-indigo-700 ring-utility-indigo-200",
    near_customer: "bg-utility-yellow-50 text-utility-yellow-700 ring-utility-yellow-200",
    delivered: "bg-utility-green-50 text-utility-green-700 ring-utility-green-200",
    returned: "bg-utility-green-50 text-utility-green-700 ring-utility-green-200",
    cancelled: "bg-utility-red-50 text-utility-red-700 ring-utility-red-200",
};

const COURIER_STATUS_STYLES: Record<CourierDisplayStatus, string> = {
    available: "bg-utility-green-50 text-utility-green-700 ring-utility-green-200",
    busy: "bg-utility-indigo-50 text-utility-indigo-700 ring-utility-indigo-200",
    paused: "bg-utility-yellow-50 text-utility-yellow-700 ring-utility-yellow-200",
    fired: "bg-utility-neutral-100 text-utility-neutral-600 ring-utility-neutral-200",
};

/**
 * Палитра бэйджей приоритета: `high` (срочный) — красный акцент, `normal` —
 * нейтральный серый, `low` — спокойный синий. Подписи в `ORDER_PRIORITY_LABELS`.
 */
const ORDER_PRIORITY_STYLES: Record<OrderPriority, string> = {
    high: "bg-utility-red-50 text-utility-red-700 ring-utility-red-200",
    normal: "bg-utility-neutral-100 text-utility-neutral-600 ring-utility-neutral-200",
    low: "bg-utility-blue-50 text-utility-blue-700 ring-utility-blue-200",
};

const BASE = "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
    return (
        <span className={cx(BASE, ORDER_STATUS_STYLES[status])}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {ORDER_STATUS_LABELS[status]}
        </span>
    );
}

export function OrderPriorityBadge({ priority }: { priority: OrderPriority }) {
    return (
        <span className={cx(BASE, ORDER_PRIORITY_STYLES[priority])}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {ORDER_PRIORITY_LABELS[priority]}
        </span>
    );
}

export function CourierStatusBadge({ status }: { status: CourierDisplayStatus }) {
    return (
        <span className={cx(BASE, COURIER_STATUS_STYLES[status])}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {COURIER_STATUS_LABELS[status]}
        </span>
    );
}

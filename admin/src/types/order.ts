/**
 * Доменные типы заказа.
 *
 * Соответствуют §4 (БД) и §5 (admin DTO) из Documentation/completion_plan.md.
 * На Этапе 1 используются для типизации моков; на Этапе 3 будут совпадать
 * с DTO бэкенда (UUID-идентификаторы, ISO-даты).
 */

export type OrderStatus =
    | "new"
    | "assigned"
    | "picked_up"
    | "near_customer"
    | "delivered"
    | "returned";

/**
 * Приоритет (срочность) заказа. Управляет взвешенным авто-назначением и
 * порядком разбора очереди на бэкенде (§8, docs/assignment.md).
 */
export type OrderPriority = "low" | "normal" | "high";

export const ORDER_PRIORITY_LABELS: Record<OrderPriority, string> = {
    low: "Низкий",
    normal: "Обычный",
    high: "Срочный",
};

/**
 * Подпись бэйджа статуса заказа в админке.
 *
 * Заметка про `delivered` vs `returned`: на бэкенде это два разных состояния
 * (см. `docs/orders.md` → «Status flow»). `delivered` — курьер передал заказ
 * клиенту; `returned` — курьер вернулся на базу, заказ закрыт. С точки зрения
 * админа оба — «заказ доставлен», поэтому подпись одинаковая. Точные моменты
 * перехода видны в timeline-секции drawer-а заказа.
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    new: "Новый",
    assigned: "Назначен",
    picked_up: "Забран",
    near_customer: "Рядом с клиентом",
    delivered: "Доставлен",
    returned: "Доставлен",
};

/** Активные статусы — заказ в работе (виден в дефолтном фильтре). */
export const ACTIVE_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
    "new",
    "assigned",
    "picked_up",
    "near_customer",
]);

/**
 * Метаданные фотографии доставки. Bytes тянутся через
 * `GET /api/admin/orders/:id/photo/:photoId` (см. docs/photos.md).
 *
 * `expiresAt` — момент удаления файла cron-ом TTL (см. settings.md).
 */
export interface PhotoMeta {
    id: string;
    uploadedAt: string;
    expiresAt: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    productDescription: string;
    comments: string | null;
    /** Курьер не видит цену, админ видит. На Этапе 1 — мок. */
    price: number | null;
    status: OrderStatus;
    priority: OrderPriority;
    courierId: string | null;
    createdByAdminId: string;
    createdAt: string;
    assignedAt: string | null;
    pickedUpAt: string | null;
    nearCustomerAt: string | null;
    deliveredAt: string | null;
    returnedAt: string | null;
    /**
     * Метаданные фото. На list-эндпоинтах backend всегда отдаёт `[]`
     * (см. docs/photos.md): реальный список приходит только на
     * `GET /api/admin/orders/:id` и transition/reassign-ответах.
     */
    photos: PhotoMeta[];
}

/**
 * ISO-метка момента, когда заказ вошёл в свой текущий статус. Берётся из
 * соответствующего timestamp-поля; для `new` — `createdAt`. Используется,
 * чтобы показать «сколько времени заказ в текущем статусе» — счётчик
 * сбрасывается при каждом переходе, потому что timestamp у нового статуса
 * стампится бэкендом отдельным полем.
 */
export function getOrderStatusSince(order: Order): string {
    switch (order.status) {
        case "new":
            return order.createdAt;
        case "assigned":
            return order.assignedAt ?? order.createdAt;
        case "picked_up":
            return order.pickedUpAt ?? order.createdAt;
        case "near_customer":
            return order.nearCustomerAt ?? order.createdAt;
        case "delivered":
            return order.deliveredAt ?? order.createdAt;
        case "returned":
            return order.returnedAt ?? order.createdAt;
    }
}

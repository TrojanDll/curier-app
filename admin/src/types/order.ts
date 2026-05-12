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

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    new: "Новый",
    assigned: "Назначен",
    picked_up: "Забран",
    near_customer: "Рядом с клиентом",
    delivered: "Доставлен",
    returned: "На базе",
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

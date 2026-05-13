/**
 * Доменные типы курьера. Соответствуют §4 БД из completion_plan.md.
 */

export interface Courier {
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    isActive: boolean;
    isPaused: boolean;
    /** Когда последний раз вернулся на базу (используется в auto-assign). */
    lastReturnedAt: string | null;
    /** Когда последний раз был поставлен на паузу. null, если сейчас на смене. */
    pausedAt: string | null;
    /** Когда последний раз вернулся на смену с паузы. null, если ни разу. */
    lastResumedAt: string | null;
    /** Когда был уволен. null, если активен. */
    firedAt: string | null;
    /** Производный live-статус, посчитанный на бэке (см. couriers.service.ts). */
    currentStatus: CourierDisplayStatus;
    /**
     * Момент входа в `currentStatus`. null — у `available` курьера, который
     * ещё ни разу не возвращался (в UI «на базе с момента найма»).
     */
    currentStatusSince: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Производный статус курьера, который показывается в таблице.
 * Считается из is_active + is_paused + наличия активного заказа.
 */
export type CourierDisplayStatus = "available" | "busy" | "paused" | "fired";

export const COURIER_STATUS_LABELS: Record<CourierDisplayStatus, string> = {
    available: "На базе",
    busy: "В работе",
    // Лейбл "Дома" = не на смене. Технически это is_paused=true в БД
    // (см. backend), но для UI/пользователя это означает «вне смены».
    paused: "Дома",
    fired: "Уволен",
};

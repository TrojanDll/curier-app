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
    paused: "На паузе",
    fired: "Уволен",
};

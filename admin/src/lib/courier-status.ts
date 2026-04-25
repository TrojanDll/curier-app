import { ACTIVE_ORDER_STATUSES, type Order } from "@/types/order";
import type { Courier, CourierDisplayStatus } from "@/types/courier";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Считает производный статус курьера на основе флагов и активных заказов.
 * Эта же логика будет использована в админ-таблице на Этапе 3 — поэтому
 * вынесено отдельно от мок-данных.
 */
export function computeCourierStatus(courier: Courier, orders: Order[]): CourierDisplayStatus {
    if (!courier.isActive) return "fired";
    if (courier.isPaused) return "paused";
    const hasActiveOrder = orders.some(
        (o) => o.courierId === courier.id && ACTIVE_ORDER_STATUSES.has(o.status),
    );
    return hasActiveOrder ? "busy" : "available";
}

export function countActiveOrders(courierId: string, orders: Order[]): number {
    return orders.filter(
        (o) => o.courierId === courierId && ACTIVE_ORDER_STATUSES.has(o.status),
    ).length;
}

export function countDeliveriesLast24h(courierId: string, orders: Order[], now: Date = new Date()): number {
    const since = now.getTime() - ONE_DAY_MS;
    return orders.filter((o) => {
        if (o.courierId !== courierId) return false;
        if (!o.deliveredAt) return false;
        return new Date(o.deliveredAt).getTime() >= since;
    }).length;
}

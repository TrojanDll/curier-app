import { computeCourierStatus } from "@/lib/courier-status";
import { MOCK_COURIERS } from "@/lib/mock/couriers";
import { MOCK_ORDERS } from "@/lib/mock/orders";
import type { Courier, CourierDisplayStatus } from "@/types/courier";
import { ACTIVE_ORDER_STATUSES, type Order } from "@/types/order";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface CourierOnShift {
    courier: Courier;
    status: CourierDisplayStatus;
    activeOrders: number;
}

export interface DashboardSummary {
    activeOrders: number;
    couriersOnShift: number;
    avgDeliveryMinutes: number | null;
    revenue24h: number;
    recentOrders: Order[];
    couriersOnShiftList: CourierOnShift[];
}

export function computeDashboardSummary(
    orders: Order[] = MOCK_ORDERS,
    couriers: Courier[] = MOCK_COURIERS,
    now: Date = new Date("2026-04-25T11:00:00Z"),
): DashboardSummary {
    const since = now.getTime() - ONE_DAY_MS;

    const activeOrders = orders.filter((o) => ACTIVE_ORDER_STATUSES.has(o.status)).length;

    const recentDeliveries = orders.filter(
        (o) => o.deliveredAt && new Date(o.deliveredAt).getTime() >= since,
    );

    const deliveryMinutes = recentDeliveries
        .map((o) => {
            if (!o.assignedAt || !o.deliveredAt) return null;
            return (new Date(o.deliveredAt).getTime() - new Date(o.assignedAt).getTime()) / 60000;
        })
        .filter((m): m is number => m !== null && Number.isFinite(m) && m >= 0);

    const avgDeliveryMinutes =
        deliveryMinutes.length === 0
            ? null
            : Math.round(deliveryMinutes.reduce((a, b) => a + b, 0) / deliveryMinutes.length);

    const revenue24h = recentDeliveries.reduce((sum, o) => sum + (o.price ?? 0), 0);

    const recentOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    const couriersOnShiftList: CourierOnShift[] = couriers
        .filter((c) => c.isActive && !c.isPaused)
        .map((c) => ({
            courier: c,
            status: computeCourierStatus(c, orders),
            activeOrders: orders.filter(
                (o) => o.courierId === c.id && ACTIVE_ORDER_STATUSES.has(o.status),
            ).length,
        }))
        .sort((a, b) => b.activeOrders - a.activeOrders);

    return {
        activeOrders,
        couriersOnShift: couriersOnShiftList.length,
        avgDeliveryMinutes,
        revenue24h,
        recentOrders,
        couriersOnShiftList,
    };
}

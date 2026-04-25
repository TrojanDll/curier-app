import { MOCK_COURIERS } from "@/lib/mock/couriers";

export type StatPeriod = "today" | "week" | "month";

export const STAT_PERIOD_LABELS: Record<StatPeriod, string> = {
    today: "Сегодня",
    week: "Неделя",
    month: "Месяц",
};

export interface OrdersPerDayPoint {
    /** ISO date (YYYY-MM-DD). */
    date: string;
    /** Человекочитаемая подпись для оси X. */
    label: string;
    delivered: number;
    returned: number;
}

export interface AvgDeliveryTimePoint {
    date: string;
    label: string;
    /** Среднее время доставки в минутах. */
    minutes: number;
}

export interface TopCourierPoint {
    name: string;
    deliveries: number;
}

export interface StatisticsOverview {
    totalOrders: number;
    delivered: number;
    avgDeliveryMinutes: number;
    revenue: number;
    ordersPerDay: OrdersPerDayPoint[];
    avgDeliveryTime: AvgDeliveryTimePoint[];
    topCouriers: TopCourierPoint[];
}

const SHORT_DATE = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });
const HOURS_OF_DAY = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit" });

/**
 * Псевдо-случайный, но детерминированный (по seed) генератор —
 * чтобы графики не «прыгали» между ререндерами.
 */
function mulberry32(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rangeBack(daysOrHours: number, unit: "day" | "hour"): Date[] {
    const now = new Date("2026-04-25T11:00:00Z");
    const result: Date[] = [];
    for (let i = daysOrHours - 1; i >= 0; i--) {
        const d = new Date(now);
        if (unit === "day") d.setDate(d.getDate() - i);
        else d.setHours(d.getHours() - i);
        result.push(d);
    }
    return result;
}

export function getStatistics(period: StatPeriod): StatisticsOverview {
    const seed = period === "today" ? 1 : period === "week" ? 7 : 30;
    const rand = mulberry32(seed);

    const points = period === "today" ? rangeBack(12, "hour") : rangeBack(period === "week" ? 7 : 30, "day");

    const ordersPerDay: OrdersPerDayPoint[] = points.map((d) => {
        const delivered = Math.round(8 + rand() * 22);
        const returned = Math.round(delivered * 0.9);
        return {
            date: d.toISOString(),
            label: period === "today" ? `${HOURS_OF_DAY.format(d)}:00` : SHORT_DATE.format(d),
            delivered,
            returned,
        };
    });

    const avgDeliveryTime: AvgDeliveryTimePoint[] = points.map((d) => ({
        date: d.toISOString(),
        label: period === "today" ? `${HOURS_OF_DAY.format(d)}:00` : SHORT_DATE.format(d),
        minutes: Math.round(35 + rand() * 30),
    }));

    const topCouriers: TopCourierPoint[] = MOCK_COURIERS.filter((c) => c.isActive)
        .map((c) => ({
            name: c.fullName.split(" ").slice(0, 2).join(" "),
            deliveries: Math.round(20 + rand() * 80),
        }))
        .sort((a, b) => b.deliveries - a.deliveries);

    const totalOrders = ordersPerDay.reduce((sum, p) => sum + p.delivered + Math.round(p.delivered * 0.15), 0);
    const delivered = ordersPerDay.reduce((sum, p) => sum + p.delivered, 0);
    const avgDeliveryMinutes = Math.round(
        avgDeliveryTime.reduce((s, p) => s + p.minutes, 0) / Math.max(1, avgDeliveryTime.length),
    );
    const revenue = delivered * 1450; // средний чек ~1450₽

    return {
        totalOrders,
        delivered,
        avgDeliveryMinutes,
        revenue,
        ordersPerDay,
        avgDeliveryTime,
        topCouriers,
    };
}

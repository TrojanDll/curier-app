"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { statisticsKeys } from "./keys";

/**
 * Контракт `/api/admin/statistics/*` (см. docs/statistics.md).
 *
 * Endpoints:
 *   GET /admin/statistics/overview — KPI + bucket series + top couriers.
 *   GET /admin/statistics/couriers — построчный срез по активным курьерам.
 *
 * Decimal-поля (`revenue`) приходят строкой "123.45" / "0.00" — мапим в
 * number ради `formatCurrency(Intl.NumberFormat)`. Drift JS-float ниже
 * 1 ₽ незначим для отображения, как и в `mapOrder.price`.
 *
 * Все запросы тут — read-only, инвалидация не нужна. На §14.3.7 (Socket.IO)
 * будет добавлена подписка на `orders:updated` для актуализации графиков
 * в реалтайме, через `invalidateQueries(statisticsKeys.all)`.
 */

export type AdminStatPeriod = "today" | "week" | "month";
export type StatBucket = "hour" | "day" | "week";

// ── DTOs (wire shapes) ───────────────────────────────────────────────────────

export interface OverviewPeriodDto {
    from: string;
    to: string;
}

export interface OverviewBucketPointDto {
    bucket: string;
    delivered: number;
    returned: number;
}

export interface AvgDeliveryBucketPointDto {
    bucket: string;
    minutes: number | null;
}

export interface TopCourierDto {
    courierId: string;
    fullName: string;
    deliveries: number;
}

export interface OverviewResponseDto {
    period: OverviewPeriodDto;
    bucket: StatBucket;
    totalOrders: number;
    delivered: number;
    cancelled: number;
    avgDeliveryMinutes: number | null;
    /** Decimal на проводе ("123.45" / "0.00"). */
    revenue: string;
    ordersPerBucket: OverviewBucketPointDto[];
    avgDeliveryTime: AvgDeliveryBucketPointDto[];
    topCouriers: TopCourierDto[];
}

export interface CourierStatsRowDto {
    id: string;
    fullName: string;
    isPaused: boolean;
    totalOrders: number;
    delivered: number;
    returned: number;
    cancelled: number;
    avgDeliveryMinutes: number | null;
    /** Decimal на проводе. */
    revenue: string;
}

export interface CouriersStatsResponseDto {
    period: OverviewPeriodDto;
    couriers: CourierStatsRowDto[];
}

// ── Domain types (used by UI) ────────────────────────────────────────────────

export interface StatisticsPeriod {
    from: string;
    to: string;
}

export interface OverviewBucketPoint {
    bucket: string;
    delivered: number;
    returned: number;
}

export interface AvgDeliveryBucketPoint {
    bucket: string;
    minutes: number | null;
}

export interface TopCourier {
    courierId: string;
    fullName: string;
    deliveries: number;
}

export interface StatisticsOverview {
    period: StatisticsPeriod;
    bucket: StatBucket;
    totalOrders: number;
    delivered: number;
    cancelled: number;
    avgDeliveryMinutes: number | null;
    revenue: number;
    ordersPerBucket: OverviewBucketPoint[];
    avgDeliveryTime: AvgDeliveryBucketPoint[];
    topCouriers: TopCourier[];
}

export interface CourierStatsRow {
    id: string;
    fullName: string;
    isPaused: boolean;
    totalOrders: number;
    delivered: number;
    returned: number;
    cancelled: number;
    avgDeliveryMinutes: number | null;
    revenue: number;
}

export interface CouriersStats {
    period: StatisticsPeriod;
    couriers: CourierStatsRow[];
}

// ── Query inputs ─────────────────────────────────────────────────────────────

export interface OverviewQuery {
    period?: AdminStatPeriod;
    from?: string;
    to?: string;
    topLimit?: number;
}

export interface CouriersStatsQuery {
    period?: AdminStatPeriod;
    from?: string;
    to?: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function mapOverview(dto: OverviewResponseDto): StatisticsOverview {
    return {
        period: { from: dto.period.from, to: dto.period.to },
        bucket: dto.bucket,
        totalOrders: dto.totalOrders,
        delivered: dto.delivered,
        cancelled: dto.cancelled,
        avgDeliveryMinutes: dto.avgDeliveryMinutes,
        revenue: Number(dto.revenue),
        ordersPerBucket: dto.ordersPerBucket.map((p) => ({
            bucket: p.bucket,
            delivered: p.delivered,
            returned: p.returned,
        })),
        avgDeliveryTime: dto.avgDeliveryTime.map((p) => ({
            bucket: p.bucket,
            minutes: p.minutes,
        })),
        topCouriers: dto.topCouriers.map((c) => ({
            courierId: c.courierId,
            fullName: c.fullName,
            deliveries: c.deliveries,
        })),
    };
}

function mapCouriersStats(dto: CouriersStatsResponseDto): CouriersStats {
    return {
        period: { from: dto.period.from, to: dto.period.to },
        couriers: dto.couriers.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            isPaused: c.isPaused,
            totalOrders: c.totalOrders,
            delivered: c.delivered,
            returned: c.returned,
            cancelled: c.cancelled,
            avgDeliveryMinutes: c.avgDeliveryMinutes,
            revenue: Number(c.revenue),
        })),
    };
}

// ── Query param builders ─────────────────────────────────────────────────────

function buildOverviewParams(query: OverviewQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (query.period) params.period = query.period;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    if (query.topLimit !== undefined) params.topLimit = query.topLimit;
    return params;
}

function buildCouriersStatsParams(query: CouriersStatsQuery): Record<string, string> {
    const params: Record<string, string> = {};
    if (query.period) params.period = query.period;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    return params;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * KPI + графики на /statistics. `placeholderData: (prev) => prev` оставляет
 * предыдущий результат видимым при переключении периода — без flash-а
 * «Загрузка…». Кеш — стандартный (см. `query-client.ts`).
 */
export function useStatisticsOverview(query: OverviewQuery) {
    return useQuery({
        queryKey: statisticsKeys.overview(query),
        queryFn: async (): Promise<StatisticsOverview> => {
            const { data } = await apiClient.get<OverviewResponseDto>(
                "/admin/statistics/overview",
                { params: buildOverviewParams(query) },
            );
            return mapOverview(data);
        },
        placeholderData: (previous) => previous,
    });
}

/**
 * Per-courier breakdown для таблицы под графиками. Возвращает строку
 * на каждого `is_active=true` курьера, даже с нулевыми заказами в окне —
 * UI не делает client-side фильтр.
 */
export function useCouriersStats(query: CouriersStatsQuery) {
    return useQuery({
        queryKey: statisticsKeys.couriers(query),
        queryFn: async (): Promise<CouriersStats> => {
            const { data } = await apiClient.get<CouriersStatsResponseDto>(
                "/admin/statistics/couriers",
                { params: buildCouriersStatsParams(query) },
            );
            return mapCouriersStats(data);
        },
        placeholderData: (previous) => previous,
    });
}

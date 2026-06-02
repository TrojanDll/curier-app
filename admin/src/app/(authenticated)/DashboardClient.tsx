"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Header } from "@/components/application/Header";
import { CourierStatusBadge, OrderStatusBadge } from "@/components/data-display/StatusBadge";
import {
    useActiveCouriers,
    useOrders,
    useStatisticsOverview,
} from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Courier } from "@/types/courier";
import type { Order, OrderStatus } from "@/types/order";

/**
 * Live-Dashboard для админки. Все четыре блока подключены к реальному API:
 *
 * 1. KPI «Активных заказов» — `GET /admin/orders?status=assigned,…&pageSize=1`,
 *    берём `total`. Лёгкий запрос: считается только count, items=1.
 * 2. KPI «Курьеров на смене» / список — `GET /admin/couriers` (`useActiveCouriers`),
 *    фильтр на клиенте: `isActive && !isPaused`. Серверный фильтр по `status`
 *    тут не подходит — `useActiveCouriers` единственный hook, и он включает
 *    `paused` ради dropdown-ов в /orders.
 * 3. KPI «Среднее время доставки» + «Выручка за сутки» —
 *    `GET /admin/statistics/overview?period=today`. Backend нормализует
 *    «today» под календарный день (UTC). См. `docs/statistics.md`.
 * 4. Панель «Последние заказы» — `GET /admin/orders?pageSize=15&sortBy=createdAt&order=desc`.
 *    Имя курьера резолвится через `lookup`, собранный из useActiveCouriers
 *    (заодно избегаем второго запроса под список).
 *
 * Все четыре query-ключа уже инвалидируются `RealtimeProvider` по
 * `orders:updated` / `couriers:status`, так что Dashboard обновляется
 * без F5 одновременно с остальными страницами.
 */
export function DashboardClient() {
    const activeStatuses: OrderStatus[] = useMemo(
        () => ["assigned", "picked_up", "near_customer", "delivered"],
        [],
    );

    const activeOrdersQuery = useOrders({ status: activeStatuses, pageSize: 1, page: 1 });
    const recentOrdersQuery = useOrders({
        pageSize: 15,
        page: 1,
        sortBy: "createdAt",
        order: "desc",
    });
    const couriersQuery = useActiveCouriers();
    const statsQuery = useStatisticsOverview({ period: "today" });

    const couriersById = useMemo(() => {
        const map = new Map<string, Courier>();
        for (const c of couriersQuery.data ?? []) map.set(c.id, c);
        return map;
    }, [couriersQuery.data]);

    const couriersOnShift = useMemo(
        () => (couriersQuery.data ?? []).filter((c) => c.isActive && !c.isPaused),
        [couriersQuery.data],
    );

    const activeOrdersCount = activeOrdersQuery.data?.total ?? null;
    const couriersOnShiftCount = couriersQuery.data
        ? couriersOnShift.length
        : null;
    const avgDeliveryMinutes = statsQuery.data?.avgDeliveryMinutes ?? null;
    const revenueToday = statsQuery.data?.revenue ?? null;
    const cancelledToday = statsQuery.data?.cancelled ?? null;

    return (
        <>
            <Header title="Главная" description="Сводные метрики за сегодня" />

            <div className="flex flex-col gap-6 px-8 py-6">
                {/* KPI cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <KpiCard
                        label="Активных заказов"
                        value={formatCount(activeOrdersCount)}
                    />
                    <KpiCard
                        label="Курьеров на смене"
                        value={formatCount(couriersOnShiftCount)}
                    />
                    <KpiCard
                        label="Среднее время доставки"
                        value={
                            !statsQuery.data
                                ? "…"
                                : avgDeliveryMinutes === null
                                  ? "—"
                                  : `${avgDeliveryMinutes} мин`
                        }
                    />
                    <KpiCard
                        label="Выручка за сегодня"
                        value={
                            !statsQuery.data
                                ? "…"
                                : formatCurrency(revenueToday)
                        }
                    />
                    <KpiCard
                        label="Отмен за сегодня"
                        value={!statsQuery.data ? "…" : formatCount(cancelledToday)}
                    />
                </div>

                {/* Two-column panel */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <RecentOrdersPanel
                        orders={recentOrdersQuery.data?.items ?? null}
                        isLoading={recentOrdersQuery.isPending}
                        couriersById={couriersById}
                    />
                    <CouriersOnShiftPanel
                        couriers={couriersQuery.data ? couriersOnShift : null}
                        isLoading={couriersQuery.isPending}
                    />
                </div>
            </div>
        </>
    );
}

function RecentOrdersPanel({
    orders,
    isLoading,
    couriersById,
}: {
    orders: Order[] | null;
    isLoading: boolean;
    couriersById: Map<string, Courier>;
}) {
    return (
        <section className="rounded-lg border border-secondary bg-primary shadow-xs xl:col-span-2">
            <header className="flex items-center justify-between border-b border-secondary px-6 py-4">
                <div>
                    <h2 className="text-md font-semibold text-primary">Последние заказы</h2>
                    <p className="text-xs text-tertiary">15 свежих заказов вне зависимости от статуса</p>
                </div>
                <Link
                    href="/orders"
                    className="text-sm font-semibold text-fg-brand-primary hover:underline"
                >
                    Все заказы →
                </Link>
            </header>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary">
                    <thead className="bg-secondary">
                        <tr className="text-left text-xs font-medium uppercase tracking-wide text-tertiary">
                            <th className="px-4 py-3">№</th>
                            <th className="px-4 py-3">Клиент</th>
                            <th className="px-4 py-3">Курьер</th>
                            <th className="px-4 py-3">Статус</th>
                            <th className="px-4 py-3">Создан</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary text-sm">
                        {orders === null && isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-sm text-tertiary">
                                    Загрузка…
                                </td>
                            </tr>
                        ) : orders === null || orders.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-12 text-center text-sm text-tertiary">
                                    Заказов пока нет.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const courier = order.courierId
                                    ? couriersById.get(order.courierId)
                                    : null;
                                return (
                                    <tr key={order.id}>
                                        <td className="px-4 py-3 font-medium text-primary">
                                            {order.orderNumber}
                                        </td>
                                        <td className="px-4 py-3 text-primary">{order.customerName}</td>
                                        <td className="px-4 py-3 text-tertiary">
                                            {courier ? (
                                                courier.fullName
                                            ) : (
                                                <span className="italic">не назначен</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <OrderStatusBadge status={order.status} />
                                        </td>
                                        <td className="px-4 py-3 text-tertiary">
                                            {formatDateTime(order.createdAt)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function CouriersOnShiftPanel({
    couriers,
    isLoading,
}: {
    couriers: Courier[] | null;
    isLoading: boolean;
}) {
    return (
        <section className="rounded-lg border border-secondary bg-primary shadow-xs">
            <header className="flex items-center justify-between border-b border-secondary px-6 py-4">
                <div>
                    <h2 className="text-md font-semibold text-primary">Курьеры на смене</h2>
                    <p className="text-xs text-tertiary">Активные и не на паузе</p>
                </div>
                <Link
                    href="/couriers"
                    className="text-sm font-semibold text-fg-brand-primary hover:underline"
                >
                    Все →
                </Link>
            </header>
            <ul className="divide-y divide-secondary">
                {couriers === null && isLoading ? (
                    <li className="px-6 py-12 text-center text-sm text-tertiary">Загрузка…</li>
                ) : couriers === null || couriers.length === 0 ? (
                    <li className="px-6 py-12 text-center text-sm text-tertiary">
                        Никого нет на смене.
                    </li>
                ) : (
                    couriers.map((courier) => (
                        <li
                            key={courier.id}
                            className="flex items-center justify-between gap-3 px-6 py-3"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-primary">
                                    {courier.fullName}
                                </p>
                                <p className="text-xs text-tertiary">{courier.phone ?? "—"}</p>
                            </div>
                            <div className="shrink-0">
                                <CourierStatusBadge status={courier.currentStatus} />
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </section>
    );
}

function KpiCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-secondary bg-primary p-4 shadow-xs">
            <p className="text-sm text-tertiary">{label}</p>
            <p className="mt-2 text-display-xs font-semibold text-primary">{value}</p>
        </div>
    );
}

function formatCount(value: number | null): string {
    if (value === null) return "…";
    return value.toString();
}

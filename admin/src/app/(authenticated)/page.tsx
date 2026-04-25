import Link from "next/link";
import { Header } from "@/components/application/Header";
import { CourierStatusBadge, OrderStatusBadge } from "@/components/data-display/StatusBadge";
import { computeDashboardSummary } from "@/lib/dashboard";
import { findMockCourier } from "@/lib/mock/couriers";
import { formatCurrency, formatDateTime } from "@/utils/format";

export const metadata = {
    title: "Главная — Курьер",
};

/**
 * Dashboard — стартовая страница админки.
 * Показывает 4 KPI за последние 24ч и две вспомогательные панели:
 * последние заказы и курьеры на смене.
 */
export default function DashboardPage() {
    const summary = computeDashboardSummary();

    return (
        <>
            <Header title="Главная" description="Сводные метрики за последние 24 часа" />

            <div className="flex flex-col gap-6 px-8 py-6">
                {/* KPI cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard label="Активных заказов" value={summary.activeOrders.toString()} />
                    <KpiCard label="Курьеров на смене" value={summary.couriersOnShift.toString()} />
                    <KpiCard
                        label="Среднее время доставки"
                        value={
                            summary.avgDeliveryMinutes === null
                                ? "—"
                                : `${summary.avgDeliveryMinutes} мин`
                        }
                    />
                    <KpiCard label="Выручка за сутки" value={formatCurrency(summary.revenue24h)} />
                </div>

                {/* Two-column panel */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    {/* Recent orders — занимает 2 из 3 колонок */}
                    <section className="rounded-lg border border-secondary bg-primary shadow-xs xl:col-span-2">
                        <header className="flex items-center justify-between border-b border-secondary px-6 py-4">
                            <div>
                                <h2 className="text-md font-semibold text-primary">Последние заказы</h2>
                                <p className="text-xs text-tertiary">5 свежих заказов вне зависимости от статуса</p>
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
                                    {summary.recentOrders.map((order) => {
                                        const courier = findMockCourier(order.courierId);
                                        return (
                                            <tr key={order.id}>
                                                <td className="px-4 py-3 font-medium text-primary">
                                                    {order.orderNumber}
                                                </td>
                                                <td className="px-4 py-3 text-primary">{order.customerName}</td>
                                                <td className="px-4 py-3 text-tertiary">
                                                    {courier ? courier.fullName : <span className="italic">не назначен</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <OrderStatusBadge status={order.status} />
                                                </td>
                                                <td className="px-4 py-3 text-tertiary">{formatDateTime(order.createdAt)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Couriers on shift */}
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
                            {summary.couriersOnShiftList.length === 0 ? (
                                <li className="px-6 py-12 text-center text-sm text-tertiary">
                                    Никого нет на смене.
                                </li>
                            ) : (
                                summary.couriersOnShiftList.map(({ courier, status, activeOrders }) => (
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
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <CourierStatusBadge status={status} />
                                            <span className="text-xs text-tertiary">
                                                Активных: <span className="tabular-nums">{activeOrders}</span>
                                            </span>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </section>
                </div>
            </div>
        </>
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

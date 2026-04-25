"use client";

import { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { STAT_PERIOD_LABELS, getStatistics, type StatPeriod } from "@/lib/mock/statistics";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";

const PERIODS: StatPeriod[] = ["today", "week", "month"];

const CHART_BRAND = "var(--color-brand-600)";
const CHART_BRAND_SOFT = "var(--color-brand-200)";
const CHART_SUCCESS = "var(--color-green-500)";
const CHART_NEUTRAL = "var(--color-neutral-300)";

export function StatisticsClient() {
    const [period, setPeriod] = useState<StatPeriod>("week");
    const stats = useMemo(() => getStatistics(period), [period]);

    return (
        <div className="flex flex-col gap-6 px-8 py-6">
            {/* Period switcher */}
            <div className="inline-flex w-fit gap-1 rounded-full bg-secondary p-1">
                {PERIODS.map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => setPeriod(p)}
                        className={cx(
                            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                            period === p
                                ? "bg-primary text-primary shadow-xs"
                                : "text-tertiary hover:text-primary",
                        )}
                    >
                        {STAT_PERIOD_LABELS[p]}
                    </button>
                ))}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Всего заказов" value={stats.totalOrders.toString()} />
                <KpiCard label="Доставлено" value={stats.delivered.toString()} />
                <KpiCard label="Среднее время" value={`${stats.avgDeliveryMinutes} мин`} />
                <KpiCard label="Выручка" value={formatCurrency(stats.revenue)} />
            </div>

            {/* Orders per period */}
            <ChartCard title="Заказы по периодам" description="Доставленные и возвращённые заказы">
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={stats.ordersPerDay} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_NEUTRAL} vertical={false} />
                        <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={12} />
                        <YAxis stroke="var(--color-text-tertiary)" fontSize={12} allowDecimals={false} />
                        <Tooltip cursor={{ fill: "var(--color-bg-secondary)" }} contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={legendStyle} />
                        <Bar dataKey="delivered" name="Доставлено" fill={CHART_BRAND} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="returned" name="На базе" fill={CHART_BRAND_SOFT} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Avg delivery time */}
                <ChartCard title="Среднее время доставки" description="Минуты от назначения до доставки">
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart
                            data={stats.avgDeliveryTime}
                            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_NEUTRAL} vertical={false} />
                            <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={12} />
                            <YAxis stroke="var(--color-text-tertiary)" fontSize={12} allowDecimals={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Line
                                type="monotone"
                                dataKey="minutes"
                                name="мин"
                                stroke={CHART_SUCCESS}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Top couriers */}
                <ChartCard title="Топ курьеров" description="По количеству доставок">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                            data={stats.topCouriers}
                            layout="vertical"
                            margin={{ top: 8, right: 12, left: 16, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_NEUTRAL} horizontal={false} />
                            <XAxis type="number" stroke="var(--color-text-tertiary)" fontSize={12} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={130}
                                stroke="var(--color-text-tertiary)"
                                fontSize={12}
                            />
                            <Tooltip cursor={{ fill: "var(--color-bg-secondary)" }} contentStyle={tooltipStyle} />
                            <Bar dataKey="deliveries" name="Доставок" fill={CHART_BRAND} radius={[0, 4, 4, 0]}>
                                {stats.topCouriers.map((_, idx) => (
                                    <Cell key={idx} fill={idx === 0 ? CHART_SUCCESS : CHART_BRAND} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            <p className="text-xs text-tertiary">
                Данные синтетические. Реальные графики — после интеграции с
                <code className="mx-1 rounded bg-secondary px-1 py-0.5">/api/admin/statistics</code>
                на Этапе 3.
            </p>
        </div>
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

function ChartCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border border-secondary bg-primary p-4 shadow-xs">
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-primary">{title}</h3>
                {description ? <p className="text-xs text-tertiary">{description}</p> : null}
            </div>
            {children}
        </div>
    );
}

const tooltipStyle: React.CSSProperties = {
    backgroundColor: "var(--color-bg-primary)",
    borderRadius: 8,
    border: "1px solid var(--color-border-secondary)",
    fontSize: 12,
    color: "var(--color-text-primary)",
};

const legendStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--color-text-tertiary)",
};

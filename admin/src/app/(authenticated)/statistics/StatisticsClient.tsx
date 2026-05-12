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
import {
    isApiError,
    useCouriersStats,
    useStatisticsOverview,
    type AdminStatPeriod,
    type AvgDeliveryBucketPoint,
    type CourierStatsRow,
    type OverviewBucketPoint,
    type StatBucket,
    type TopCourier,
} from "@/lib/api";
import { cx } from "@/utils/cx";
import { formatCurrency } from "@/utils/format";

const PERIODS: AdminStatPeriod[] = ["today", "week", "month"];

const PERIOD_LABELS: Record<AdminStatPeriod, string> = {
    today: "Сегодня",
    week: "Неделя",
    month: "Месяц",
};

const CHART_BRAND = "var(--color-brand-600)";
const CHART_BRAND_SOFT = "var(--color-brand-200)";
const CHART_SUCCESS = "var(--color-green-500)";
const CHART_NEUTRAL = "var(--color-neutral-300)";

const HOUR_LABEL = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const DAY_LABEL = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });
const WEEK_LABEL = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" });

function formatBucketLabel(iso: string, bucket: StatBucket): string {
    const date = new Date(iso);
    if (bucket === "hour") return HOUR_LABEL.format(date);
    if (bucket === "week") return `нед. ${WEEK_LABEL.format(date)}`;
    return DAY_LABEL.format(date);
}

function formatMinutes(minutes: number | null): string {
    if (minutes === null) return "—";
    return `${minutes} мин`;
}

interface OrdersChartPoint {
    label: string;
    delivered: number;
    returned: number;
}

interface AvgChartPoint {
    label: string;
    minutes: number | null;
}

interface TopCourierChartPoint {
    name: string;
    deliveries: number;
}

function buildOrdersChart(
    points: OverviewBucketPoint[],
    bucket: StatBucket,
): OrdersChartPoint[] {
    return points.map((p) => ({
        label: formatBucketLabel(p.bucket, bucket),
        delivered: p.delivered,
        returned: p.returned,
    }));
}

function buildAvgChart(
    points: AvgDeliveryBucketPoint[],
    bucket: StatBucket,
): AvgChartPoint[] {
    return points.map((p) => ({
        label: formatBucketLabel(p.bucket, bucket),
        minutes: p.minutes,
    }));
}

function buildTopCouriersChart(top: TopCourier[]): TopCourierChartPoint[] {
    return top.map((c) => ({
        name: c.fullName.split(" ").slice(0, 2).join(" "),
        deliveries: c.deliveries,
    }));
}

export function StatisticsClient() {
    const [period, setPeriod] = useState<AdminStatPeriod>("week");
    const overviewQuery = useStatisticsOverview({ period });
    const couriersStatsQuery = useCouriersStats({ period });

    const overview = overviewQuery.data;
    const overviewError = overviewQuery.error
        ? isApiError(overviewQuery.error)
            ? overviewQuery.error.messages().join(". ")
            : "Не удалось загрузить статистику"
        : null;
    const couriersError = couriersStatsQuery.error
        ? isApiError(couriersStatsQuery.error)
            ? couriersStatsQuery.error.messages().join(". ")
            : "Не удалось загрузить статистику по курьерам"
        : null;

    const ordersChart = useMemo(
        () => (overview ? buildOrdersChart(overview.ordersPerBucket, overview.bucket) : []),
        [overview],
    );
    const avgChart = useMemo(
        () => (overview ? buildAvgChart(overview.avgDeliveryTime, overview.bucket) : []),
        [overview],
    );
    const topCouriersChart = useMemo(
        () => (overview ? buildTopCouriersChart(overview.topCouriers) : []),
        [overview],
    );

    const isInitialLoading = overviewQuery.isLoading && !overview;

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
                        {PERIOD_LABELS[p]}
                    </button>
                ))}
            </div>

            {overviewError ? (
                <div className="rounded-md border border-error_subtle bg-error_primary px-4 py-3 text-sm text-error-primary">
                    {overviewError}
                </div>
            ) : null}

            {isInitialLoading ? (
                <div className="rounded-lg border border-secondary bg-primary p-8 text-center text-sm text-tertiary shadow-xs">
                    Загрузка статистики…
                </div>
            ) : overview ? (
                <>
                    {/* KPI cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <KpiCard label="Всего заказов" value={overview.totalOrders.toString()} />
                        <KpiCard label="Доставлено" value={overview.delivered.toString()} />
                        <KpiCard
                            label="Среднее время"
                            value={formatMinutes(overview.avgDeliveryMinutes)}
                        />
                        <KpiCard label="Выручка" value={formatCurrency(overview.revenue)} />
                    </div>

                    {/* Orders per bucket */}
                    <ChartCard
                        title="Заказы по периодам"
                        description="Доставленные и возвращённые на базу"
                    >
                        {ordersChart.length === 0 ? (
                            <EmptyChart />
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={ordersChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_NEUTRAL} vertical={false} />
                                    <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={12} />
                                    <YAxis stroke="var(--color-text-tertiary)" fontSize={12} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: "var(--color-bg-secondary)" }} contentStyle={tooltipStyle} />
                                    <Legend wrapperStyle={legendStyle} />
                                    <Bar dataKey="delivered" name="Доставлено" fill={CHART_BRAND} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="returned" name="На базе" fill={CHART_BRAND_SOFT} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {/* Avg delivery time */}
                        <ChartCard title="Среднее время доставки" description="Минуты от назначения до доставки">
                            {avgChart.length === 0 ? (
                                <EmptyChart />
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <LineChart
                                        data={avgChart}
                                        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_NEUTRAL} vertical={false} />
                                        <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={12} />
                                        <YAxis stroke="var(--color-text-tertiary)" fontSize={12} allowDecimals={false} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        {/* connectNulls=false → разрыв линии в bucket-ах без доставок (`minutes=null`). */}
                                        <Line
                                            type="monotone"
                                            dataKey="minutes"
                                            name="мин"
                                            stroke={CHART_SUCCESS}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            activeDot={{ r: 5 }}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>

                        {/* Top couriers */}
                        <ChartCard title="Топ курьеров" description="По количеству доставок">
                            {topCouriersChart.length === 0 ? (
                                <EmptyChart text="За период никто не закрыл ни одной доставки." />
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart
                                        data={topCouriersChart}
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
                                            {topCouriersChart.map((_, idx) => (
                                                <Cell key={idx} fill={idx === 0 ? CHART_SUCCESS : CHART_BRAND} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>

                    {/* Per-courier breakdown */}
                    <CouriersBreakdownCard
                        rows={couriersStatsQuery.data?.couriers ?? []}
                        isLoading={couriersStatsQuery.isLoading && !couriersStatsQuery.data}
                        error={couriersError}
                    />
                </>
            ) : null}
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

function EmptyChart({ text = "Нет данных за период." }: { text?: string }) {
    return (
        <div className="flex h-[260px] items-center justify-center text-sm text-tertiary">
            {text}
        </div>
    );
}

function CouriersBreakdownCard({
    rows,
    isLoading,
    error,
}: {
    rows: CourierStatsRow[];
    isLoading: boolean;
    error: string | null;
}) {
    return (
        <div className="rounded-lg border border-secondary bg-primary shadow-xs">
            <div className="border-b border-secondary px-4 py-3">
                <h3 className="text-sm font-semibold text-primary">По курьерам</h3>
                <p className="text-xs text-tertiary">
                    Срез по каждому активному курьеру за выбранный период
                </p>
            </div>
            {error ? (
                <div className="px-4 py-6 text-sm text-error-primary">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary">
                        <thead className="bg-secondary">
                            <tr className="text-left text-xs font-medium uppercase tracking-wide text-tertiary">
                                <th className="px-4 py-3">Курьер</th>
                                <th className="px-4 py-3 text-right">Всего</th>
                                <th className="px-4 py-3 text-right">Доставлено</th>
                                <th className="px-4 py-3 text-right">На базу</th>
                                <th className="px-4 py-3 text-right">Среднее время</th>
                                <th className="px-4 py-3 text-right">Выручка</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-tertiary">
                                        Загрузка…
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-tertiary">
                                        За период активных курьеров не найдено.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-4 py-3 font-medium text-primary">
                                            <div className="flex flex-col">
                                                <span>{row.fullName}</span>
                                                {row.isPaused ? (
                                                    <span className="text-xs text-tertiary">на паузе</span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-tertiary">
                                            {row.totalOrders}
                                        </td>
                                        <td className="px-4 py-3 text-right text-primary">
                                            {row.delivered}
                                        </td>
                                        <td className="px-4 py-3 text-right text-tertiary">
                                            {row.returned}
                                        </td>
                                        <td className="px-4 py-3 text-right text-tertiary">
                                            {formatMinutes(row.avgDeliveryMinutes)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-tertiary">
                                            {formatCurrency(row.revenue)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
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

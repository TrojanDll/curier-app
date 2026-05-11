"use client";

import { Plus, SearchLg, X } from "@untitledui/icons";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { OrderStatusBadge } from "@/components/data-display/StatusBadge";
import { useDebounce } from "@/hooks/use-debounce";
import {
    isApiError,
    useActiveCouriers,
    useOrders,
    useReassignOrder,
    type OrdersListQuery,
} from "@/lib/api";
import { ACTIVE_ORDER_STATUSES, ORDER_STATUS_LABELS, type Order, type OrderStatus } from "@/types/order";
import { cx } from "@/utils/cx";
import { formatCurrency, formatDateTime, formatDuration } from "@/utils/format";

type StatusFilter = "all" | "active" | OrderStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Все" },
    { value: "active", label: "Активные" },
    { value: "new", label: ORDER_STATUS_LABELS.new },
    { value: "assigned", label: ORDER_STATUS_LABELS.assigned },
    { value: "picked_up", label: ORDER_STATUS_LABELS.picked_up },
    { value: "near_customer", label: ORDER_STATUS_LABELS.near_customer },
    { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
    { value: "returned", label: ORDER_STATUS_LABELS.returned },
];

const PAGE_SIZE = 10;
const ACTIVE_STATUSES_ARRAY: OrderStatus[] = Array.from(ACTIVE_ORDER_STATUSES);
const REASSIGNABLE_STATUSES: ReadonlySet<OrderStatus> = new Set(["new", "assigned"]);

function buildQuery(
    statusFilter: StatusFilter,
    courierFilter: string,
    debouncedSearch: string,
    page: number,
): OrdersListQuery {
    const q: OrdersListQuery = {
        page,
        pageSize: PAGE_SIZE,
        sortBy: "createdAt",
        order: "desc",
    };
    if (statusFilter === "active") {
        q.status = ACTIVE_STATUSES_ARRAY;
    } else if (statusFilter !== "all") {
        q.status = [statusFilter];
    }
    if (courierFilter !== "all") q.courierId = courierFilter;
    const trimmed = debouncedSearch.trim();
    if (trimmed) q.search = trimmed;
    return q;
}

export function OrdersClient() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [courierFilter, setCourierFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 300);
    const [page, setPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Дебаунс search и переключение фильтров требуют сброса на первую страницу.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, courierFilter]);

    const query = useMemo(
        () => buildQuery(statusFilter, courierFilter, debouncedSearch, page),
        [statusFilter, courierFilter, debouncedSearch, page],
    );
    const ordersQuery = useOrders(query);
    const couriersQuery = useActiveCouriers();

    const items = ordersQuery.data?.items ?? [];
    const total = ordersQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const couriers = couriersQuery.data ?? [];
    const courierById = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of couriers) m.set(c.id, c.fullName);
        return m;
    }, [couriers]);

    // Если page переехал за границу (например, фильтр сильно сократил выдачу) — откат.
    useEffect(() => {
        if (!ordersQuery.data) return;
        if (page > totalPages) setPage(totalPages);
    }, [ordersQuery.data, page, totalPages]);

    const errorMessage =
        ordersQuery.error && isApiError(ordersQuery.error)
            ? ordersQuery.error.messages().join(". ")
            : ordersQuery.error
              ? "Не удалось загрузить заказы"
              : null;

    return (
        <div className="flex flex-col gap-4 px-8 py-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => setStatusFilter(f.value)}
                            className={cx(
                                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                                statusFilter === f.value
                                    ? "bg-bg-brand-solid text-white"
                                    : "bg-primary text-secondary ring-1 ring-secondary hover:bg-primary_hover",
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-72">
                        <Input
                            type="search"
                            placeholder="Поиск по номеру, клиенту, адресу…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            leftIcon={<SearchLg className="size-4" />}
                        />
                    </div>
                    <select
                        value={courierFilter}
                        onChange={(e) => setCourierFilter(e.target.value)}
                        disabled={couriersQuery.isLoading}
                        className="h-10 rounded-md border border-primary bg-primary px-3 text-sm text-primary shadow-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                    >
                        <option value="all">Все курьеры</option>
                        {couriers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.fullName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error banner */}
            {errorMessage ? (
                <div className="rounded-md border border-error_subtle bg-error_primary px-4 py-3 text-sm text-error-primary">
                    {errorMessage}
                </div>
            ) : null}

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-secondary bg-primary shadow-xs">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary">
                        <thead className="bg-secondary">
                            <tr className="text-left text-xs font-medium text-tertiary uppercase tracking-wide">
                                <th className="px-4 py-3">№ заказа</th>
                                <th className="px-4 py-3">Клиент</th>
                                <th className="px-4 py-3">Адрес</th>
                                <th className="px-4 py-3">Курьер</th>
                                <th className="px-4 py-3">Статус</th>
                                <th className="px-4 py-3">Создан</th>
                                <th className="px-4 py-3 text-right">Сумма</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary">
                            {ordersQuery.isLoading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-tertiary">
                                        Загрузка…
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-tertiary">
                                        По заданным фильтрам заказов нет.
                                    </td>
                                </tr>
                            ) : (
                                items.map((order) => {
                                    const courierName = order.courierId
                                        ? (courierById.get(order.courierId) ?? "—")
                                        : null;
                                    return (
                                        <tr
                                            key={order.id}
                                            onClick={() => setSelectedOrder(order)}
                                            className="cursor-pointer text-sm text-primary transition-colors hover:bg-primary_hover"
                                        >
                                            <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-primary">{order.customerName}</div>
                                                <div className="text-xs text-tertiary">{order.customerPhone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-tertiary">{order.deliveryAddress}</td>
                                            <td className="px-4 py-3 text-tertiary">
                                                {courierName ?? <span className="italic">не назначен</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <OrderStatusBadge status={order.status} />
                                            </td>
                                            <td className="px-4 py-3 text-tertiary">{formatDateTime(order.createdAt)}</td>
                                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                {formatCurrency(order.price)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > PAGE_SIZE ? (
                    <div className="flex items-center justify-between border-t border-secondary px-4 py-3 text-sm text-tertiary">
                        <span>
                            Показано {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} из {total}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={page <= 1 || ordersQuery.isFetching}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Назад
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={page >= totalPages || ordersQuery.isFetching}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                Вперёд
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Drawer */}
            <OrderDetailsDrawer
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onOrderUpdated={(updated) => setSelectedOrder(updated)}
            />
        </div>
    );
}

interface DrawerProps {
    order: Order | null;
    onClose: () => void;
    onOrderUpdated: (order: Order) => void;
}

function OrderDetailsDrawer({ order, onClose, onOrderUpdated }: DrawerProps) {
    useEffect(() => {
        if (!order) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [order, onClose]);

    if (!order) return null;

    const timeline: { label: string; iso: string | null }[] = [
        { label: "Создан", iso: order.createdAt },
        { label: "Назначен", iso: order.assignedAt },
        { label: "Забран", iso: order.pickedUpAt },
        { label: "Рядом с клиентом", iso: order.nearCustomerAt },
        { label: "Доставлен", iso: order.deliveredAt },
        { label: "На базе", iso: order.returnedAt },
    ];

    return (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
            <div className="flex-1 bg-overlay/40" onClick={onClose} aria-hidden />
            <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-primary shadow-xl">
                <div className="flex items-start justify-between border-b border-secondary px-6 py-5">
                    <div>
                        <h2 id="order-drawer-title" className="text-lg font-semibold text-primary">
                            Заказ {order.orderNumber}
                        </h2>
                        <div className="mt-2">
                            <OrderStatusBadge status={order.status} />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-fg-quaternary transition-colors hover:bg-primary_hover hover:text-fg-primary"
                        aria-label="Закрыть"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <DrawerBody order={order} />

                <div className="border-t border-secondary px-6 py-5">
                    <h3 className="mb-3 text-sm font-semibold text-primary">История статусов</h3>
                    <ol className="flex flex-col gap-2">
                        {timeline
                            .filter((t) => t.iso)
                            .map((t) => (
                                <li
                                    key={t.label}
                                    className="flex items-center justify-between text-sm text-tertiary"
                                >
                                    <span className="text-secondary">{t.label}</span>
                                    <span className="tabular-nums">{formatDateTime(t.iso)}</span>
                                </li>
                            ))}
                    </ol>
                </div>

                <div className="mt-auto border-t border-secondary px-6 py-5">
                    <ReassignSection order={order} onSuccess={onOrderUpdated} />
                </div>
            </aside>
        </div>
    );
}

function DrawerBody({ order }: { order: Order }) {
    const couriersQuery = useActiveCouriers();
    const courierName = order.courierId
        ? (couriersQuery.data?.find((c) => c.id === order.courierId)?.fullName ?? "не назначен")
        : "не назначен";
    return (
        <dl className="flex flex-col gap-4 px-6 py-5 text-sm">
            <DrawerRow label="Клиент" value={order.customerName} />
            <DrawerRow label="Телефон" value={order.customerPhone} />
            <DrawerRow label="Адрес" value={order.deliveryAddress} />
            <DrawerRow label="Товар" value={order.productDescription} />
            {order.comments ? <DrawerRow label="Комментарий" value={order.comments} /> : null}
            <DrawerRow label="Курьер" value={courierName} />
            <DrawerRow label="Сумма" value={formatCurrency(order.price)} />
            {order.deliveredAt ? (
                <DrawerRow
                    label="Время доставки"
                    value={formatDuration(order.assignedAt, order.deliveredAt)}
                />
            ) : null}
        </dl>
    );
}

function ReassignSection({ order, onSuccess }: { order: Order; onSuccess: (o: Order) => void }) {
    const couriersQuery = useActiveCouriers();
    const reassign = useReassignOrder();
    const [target, setTarget] = useState<string>("");

    useEffect(() => {
        setTarget("");
        reassign.reset();
        // Сбрасываем форму при смене заказа в drawer-е.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.id]);

    const canReassign = REASSIGNABLE_STATUSES.has(order.status);
    const eligibleCouriers = useMemo(
        () => (couriersQuery.data ?? []).filter((c) => !c.isPaused && c.id !== order.courierId),
        [couriersQuery.data, order.courierId],
    );
    const errorMessage =
        reassign.error && isApiError(reassign.error) ? reassign.error.messages().join(". ") : null;

    if (!canReassign) {
        return (
            <p className="text-xs text-tertiary">
                Переназначение доступно только для статусов «Новый» и «Назначен».
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <label className="text-xs uppercase tracking-wide text-tertiary" htmlFor="reassign-target">
                Переназначить курьеру
            </label>
            <select
                id="reassign-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={couriersQuery.isLoading || reassign.isPending}
                className="h-10 rounded-md border border-primary bg-primary px-3 text-sm text-primary shadow-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
            >
                <option value="">— выберите курьера —</option>
                {eligibleCouriers.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.fullName}
                    </option>
                ))}
            </select>
            {errorMessage ? <p className="text-xs text-error-primary">{errorMessage}</p> : null}
            <Button
                variant="primary"
                disabled={!target || reassign.isPending}
                onClick={() => {
                    reassign.mutate(
                        { orderId: order.id, courierId: target },
                        {
                            onSuccess: (updated) => {
                                onSuccess(updated);
                                setTarget("");
                            },
                        },
                    );
                }}
            >
                {reassign.isPending ? "Назначаем…" : "Подтвердить"}
            </Button>
        </div>
    );
}

function DrawerRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wide text-tertiary">{label}</dt>
            <dd className="text-sm text-primary">{value}</dd>
        </div>
    );
}

export function CreateOrderButton() {
    return (
        <Button
            leftIcon={<Plus className="size-4" />}
            disabled
            title="Будет доступно в следующей подзадаче"
        >
            Создать заказ
        </Button>
    );
}

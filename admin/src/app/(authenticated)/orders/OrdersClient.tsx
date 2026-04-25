"use client";

import { Plus, SearchLg, X } from "@untitledui/icons";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { OrderStatusBadge } from "@/components/data-display/StatusBadge";
import { MOCK_COURIERS, findMockCourier } from "@/lib/mock/couriers";
import { MOCK_ORDERS } from "@/lib/mock/orders";
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

function matchesStatus(order: Order, filter: StatusFilter): boolean {
    if (filter === "all") return true;
    if (filter === "active") return ACTIVE_ORDER_STATUSES.has(order.status);
    return order.status === filter;
}

function matchesSearch(order: Order, query: string): boolean {
    if (!query) return true;
    const normalized = query.trim().toLowerCase();
    return (
        order.orderNumber.toLowerCase().includes(normalized) ||
        order.customerName.toLowerCase().includes(normalized) ||
        order.customerPhone.toLowerCase().includes(normalized) ||
        order.deliveryAddress.toLowerCase().includes(normalized)
    );
}

function matchesCourier(order: Order, courierId: string): boolean {
    if (courierId === "all") return true;
    if (courierId === "unassigned") return order.courierId === null;
    return order.courierId === courierId;
}

export function OrdersClient() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [courierFilter, setCourierFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const filtered = useMemo(() => {
        return [...MOCK_ORDERS]
            .filter((o) => matchesStatus(o, statusFilter))
            .filter((o) => matchesCourier(o, courierFilter))
            .filter((o) => matchesSearch(o, search))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [statusFilter, courierFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Обёртки сбрасывают пагинацию атомарно с фильтрами — без useEffect.
    const applyStatusFilter = (value: StatusFilter) => {
        setStatusFilter(value);
        setPage(1);
    };
    const applyCourierFilter = (value: string) => {
        setCourierFilter(value);
        setPage(1);
    };
    const applySearch = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    return (
        <div className="flex flex-col gap-4 px-8 py-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => applyStatusFilter(f.value)}
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
                            value={search}
                            onChange={(e) => applySearch(e.target.value)}
                            leftIcon={<SearchLg className="size-4" />}
                        />
                    </div>
                    <select
                        value={courierFilter}
                        onChange={(e) => applyCourierFilter(e.target.value)}
                        className="h-10 rounded-md border border-primary bg-primary px-3 text-sm text-primary shadow-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                        <option value="all">Все курьеры</option>
                        <option value="unassigned">Не назначен</option>
                        {MOCK_COURIERS.filter((c) => c.isActive).map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.fullName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

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
                            {pageItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-tertiary">
                                        По заданным фильтрам заказов нет.
                                    </td>
                                </tr>
                            ) : (
                                pageItems.map((order) => {
                                    const courier = findMockCourier(order.courierId);
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
                                                {courier ? courier.fullName : <span className="italic">не назначен</span>}
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
                {filtered.length > PAGE_SIZE ? (
                    <div className="flex items-center justify-between border-t border-secondary px-4 py-3 text-sm text-tertiary">
                        <span>
                            Показано {(safePage - 1) * PAGE_SIZE + 1}–
                            {Math.min(safePage * PAGE_SIZE, filtered.length)} из {filtered.length}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={safePage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Назад
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                Вперёд
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Drawer */}
            <OrderDetailsDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
        </div>
    );
}

interface DrawerProps {
    order: Order | null;
    onClose: () => void;
}

function OrderDetailsDrawer({ order, onClose }: DrawerProps) {
    useEffect(() => {
        if (!order) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [order, onClose]);

    if (!order) return null;
    const courier = findMockCourier(order.courierId);

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

                <dl className="flex flex-col gap-4 px-6 py-5 text-sm">
                    <DrawerRow label="Клиент" value={order.customerName} />
                    <DrawerRow label="Телефон" value={order.customerPhone} />
                    <DrawerRow label="Адрес" value={order.deliveryAddress} />
                    <DrawerRow label="Товар" value={order.productDescription} />
                    {order.comments ? <DrawerRow label="Комментарий" value={order.comments} /> : null}
                    <DrawerRow label="Курьер" value={courier ? courier.fullName : "не назначен"} />
                    <DrawerRow label="Сумма" value={formatCurrency(order.price)} />
                    {order.deliveredAt ? (
                        <DrawerRow
                            label="Время доставки"
                            value={formatDuration(order.assignedAt, order.deliveredAt)}
                        />
                    ) : null}
                </dl>

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

                <div className="mt-auto flex flex-col gap-2 border-t border-secondary px-6 py-5">
                    <Button variant="secondary" disabled>
                        Переназначить курьера
                    </Button>
                    <p className="text-xs text-tertiary">
                        Действия будут активированы после интеграции с backend (Этап 3).
                    </p>
                </div>
            </aside>
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
        <Button leftIcon={<Plus className="size-4" />} disabled title="Будет доступно после интеграции с backend">
            Создать заказ
        </Button>
    );
}

"use client";

import { Plus, SearchLg, X } from "@untitledui/icons";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { OrderPriorityBadge, OrderStatusBadge } from "@/components/data-display/StatusBadge";
import { useDebounce } from "@/hooks/use-debounce";
import {
    isApiError,
    useActiveCouriers,
    useAutoAssignOrder,
    useCreateOrder,
    useOrder,
    useOrders,
    useReassignOrder,
    type CreateOrderInput,
    type OrdersListQuery,
} from "@/lib/api";
import {
    ACTIVE_ORDER_STATUSES,
    getOrderStatusSince,
    ORDER_PRIORITY_LABELS,
    ORDER_STATUS_LABELS,
    type Order,
    type OrderPriority,
    type OrderStatus,
    type PhotoMeta,
} from "@/types/order";
import { cx } from "@/utils/cx";
import {
    formatCurrency,
    formatDateTime,
    formatDuration,
    formatTimeSince,
} from "@/utils/format";

type StatusFilter = "all" | "active" | OrderStatus;

/**
 * `delivered` в фильтре охватывает и `delivered`, и `returned` статусы.
 * С точки зрения админа оба означают «заказ доставлен», и подпись бэйджа у
 * них одинаковая (`ORDER_STATUS_LABELS`); отдельная кнопка «На базе» только
 * запутывает. Точные моменты перехода видно в timeline drawer-а.
 */
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Все" },
    { value: "active", label: "Активные" },
    { value: "new", label: ORDER_STATUS_LABELS.new },
    { value: "assigned", label: ORDER_STATUS_LABELS.assigned },
    { value: "picked_up", label: ORDER_STATUS_LABELS.picked_up },
    { value: "near_customer", label: ORDER_STATUS_LABELS.near_customer },
    { value: "delivered", label: ORDER_STATUS_LABELS.delivered },
];

const PAGE_SIZE = 10;
const ACTIVE_STATUSES_ARRAY: OrderStatus[] = Array.from(ACTIVE_ORDER_STATUSES);
const COMPLETED_STATUSES: OrderStatus[] = ["delivered", "returned"];
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
    } else if (statusFilter === "delivered") {
        // Фильтр «Доставлен» охватывает оба терминальных состояния заказа —
        // `delivered` (курьер передал клиенту) и `returned` (курьер вернулся
        // на базу). Для админа это одно и то же завершение.
        q.status = COMPLETED_STATUSES;
    } else if (statusFilter !== "all") {
        q.status = [statusFilter];
    }
    if (courierFilter !== "all") q.courierId = courierFilter;
    const trimmed = debouncedSearch.trim();
    if (trimmed) q.search = trimmed;
    return q;
}

/**
 * Тикающий `now` для счётчиков «сколько в статусе» в таблице заказов.
 * 30s достаточно — гранулярность счётчика «минута», экономим перерендеры.
 */
function useNowTick(intervalMs: number = 30_000): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

export function OrdersClient() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
    const [courierFilter, setCourierFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 300);
    const [page, setPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const now = useNowTick();

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
                    <Button
                        leftIcon={<Plus className="size-4" />}
                        onClick={() => setIsCreateOpen(true)}
                    >
                        Создать заказ
                    </Button>
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
                                <th className="px-4 py-3">В статусе</th>
                                <th className="px-4 py-3">Создан</th>
                                <th className="px-4 py-3 text-right">Сумма</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary">
                            {ordersQuery.isLoading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-tertiary">
                                        Загрузка…
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-tertiary">
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
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <OrderStatusBadge status={order.status} />
                                                    {order.priority !== "normal" ? (
                                                        <OrderPriorityBadge priority={order.priority} />
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-tertiary tabular-nums">
                                                {formatTimeSince(getOrderStatusSince(order), now)}
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
                // key сбрасывает локальные state при смене заказа
                // (lightbox + ReassignSection target) — идиоматичнее useEffect-сбросов.
                key={selectedOrder?.id ?? "empty"}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onOrderUpdated={(updated) => setSelectedOrder(updated)}
            />

            {/* Create order drawer */}
            <CreateOrderDrawer
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={() => setIsCreateOpen(false)}
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
    // Свежие детали с photos. Списочный endpoint всегда возвращает `photos: []`,
    // а детальный — реальный список (см. docs/photos.md → «Embedded into order detail»).
    const detailQuery = useOrder(order?.id ?? null);
    const [lightboxPhoto, setLightboxPhoto] = useState<PhotoMeta | null>(null);

    // Esc закрывает lightbox, если открыт; иначе — drawer.
    // Сброс lightbox при смене заказа делается через key={order.id} на компоненте.
    useEffect(() => {
        if (!order) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (lightboxPhoto) {
                setLightboxPhoto(null);
            } else {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [order, onClose, lightboxPhoto]);

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
        <>
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
            <div className="flex-1 bg-overlay/40" onClick={onClose} aria-hidden />
            <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-primary shadow-xl">
                <div className="flex items-start justify-between border-b border-secondary px-6 py-5">
                    <div>
                        <h2 id="order-drawer-title" className="text-lg font-semibold text-primary">
                            Заказ {order.orderNumber}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <OrderStatusBadge status={order.status} />
                            <OrderPriorityBadge priority={order.priority} />
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

                <PhotosSection
                    orderId={order.id}
                    photos={detailQuery.data?.photos ?? null}
                    isLoading={detailQuery.isLoading}
                    isError={!!detailQuery.error}
                    onOpen={(photo) => setLightboxPhoto(photo)}
                />

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

        {/* Lightbox — sibling drawer-контейнера, чтобы z-[60] гарантированно
            перекрывал aside (z-50 родителя создаёт stacking-context). */}
        {lightboxPhoto ? (
            <PhotoLightbox
                orderId={order.id}
                photo={lightboxPhoto}
                onClose={() => setLightboxPhoto(null)}
            />
        ) : null}
        </>
    );
}

interface PhotosSectionProps {
    orderId: string;
    /** null — детали ещё не пришли; пустой массив — фото нет. */
    photos: PhotoMeta[] | null;
    isLoading: boolean;
    isError: boolean;
    onOpen: (photo: PhotoMeta) => void;
}

/**
 * Bytes тянутся через same-origin BFF (`/api/[...path]`), который
 * подмешивает Authorization из HttpOnly cookie. Это позволяет
 * использовать обычный `<img src>` — JWT Bearer хедер на `<img>`
 * напрямую не выставить (см. docs/photos.md → «Streaming GET»).
 */
function PhotosSection({ orderId, photos, isLoading, isError, onOpen }: PhotosSectionProps) {
    let body: React.ReactNode;
    if (isError) {
        body = <p className="text-sm text-error-primary">Не удалось загрузить фото.</p>;
    } else if (photos === null || isLoading) {
        body = <p className="text-sm text-tertiary">Загрузка фото…</p>;
    } else if (photos.length === 0) {
        body = <p className="text-sm text-tertiary">Фото ещё не загружено.</p>;
    } else {
        body = (
            <ul className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                    <li key={photo.id}>
                        <button
                            type="button"
                            onClick={() => onOpen(photo)}
                            className="block w-full overflow-hidden rounded-md border border-secondary bg-secondary transition hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                            aria-label={`Открыть фото от ${formatDateTime(photo.uploadedAt)}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element --
                                BFF-streamed authorized content, не подходит для next/image. */}
                            <img
                                src={photoUrl(orderId, photo.id)}
                                alt=""
                                loading="lazy"
                                className="aspect-square w-full object-cover"
                            />
                        </button>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div className="border-t border-secondary px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-primary">Фото доставки</h3>
            {body}
        </div>
    );
}

function PhotoLightbox({
    orderId,
    photo,
    onClose,
}: {
    orderId: string;
    photo: PhotoMeta;
    onClose: () => void;
}) {
    // Портал в body — drawer-контейнер имеет z-50 и создаёт собственный
    // stacking-context; render lightbox-а как sibling document.body
    // исключает любые конкуренции с локальной иерархией.
    if (typeof document === "undefined") return null;
    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр фото"
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-md bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                aria-label="Закрыть фото"
            >
                <X className="size-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element --
                BFF-streamed authorized content, не подходит для next/image. */}
            <img
                src={photoUrl(orderId, photo.id)}
                alt={`Фото загружено ${formatDateTime(photo.uploadedAt)}`}
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
            />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-black/60 px-3 py-1 text-xs text-white">
                Загружено {formatDateTime(photo.uploadedAt)}
            </p>
        </div>,
        document.body,
    );
}

/**
 * Same-origin URL для admin-фото. BFF proxy
 * (`admin/src/app/api/[...path]/route.ts`) переписывает запрос на
 * backend с заголовком Authorization из HttpOnly cookie.
 */
function photoUrl(orderId: string, photoId: string): string {
    return `/api/admin/orders/${orderId}/photo/${photoId}`;
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
    const autoAssign = useAutoAssignOrder();
    // Сброс формы при смене заказа обеспечен key={order.id} у OrderDetailsDrawer.
    const [target, setTarget] = useState<string>("");

    const canReassign = REASSIGNABLE_STATUSES.has(order.status);
    const eligibleCouriers = useMemo(
        () => (couriersQuery.data ?? []).filter((c) => !c.isPaused && c.id !== order.courierId),
        [couriersQuery.data, order.courierId],
    );
    // Один баннер для двух мутаций — обе пишут в одну и ту же секцию UI.
    const errorMessage = reassign.error
        ? isApiError(reassign.error)
            ? reassign.error.messages().join(". ")
            : "Не удалось переназначить заказ"
        : autoAssign.error
          ? isApiError(autoAssign.error)
              ? autoAssign.error.messages().join(". ")
              : "Не удалось назначить автоматически"
          : null;
    const busy = reassign.isPending || autoAssign.isPending;

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
                disabled={couriersQuery.isLoading || busy}
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
            <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                    variant="primary"
                    disabled={!target || busy}
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
                <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                        autoAssign.mutate(order.id, {
                            onSuccess: (updated) => {
                                onSuccess(updated);
                                setTarget("");
                            },
                        });
                    }}
                >
                    {autoAssign.isPending ? "Подбираем…" : "Назначить автоматически"}
                </Button>
            </div>
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

interface CreateOrderDrawerProps {
    open: boolean;
    onClose: () => void;
    onCreated: (order: Order) => void;
}

function CreateOrderDrawer({ open, onClose, onCreated }: CreateOrderDrawerProps) {
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-order-drawer-title"
        >
            <div className="flex-1 bg-overlay/40" onClick={onClose} aria-hidden />
            <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-primary shadow-xl">
                <div className="flex items-start justify-between border-b border-secondary px-6 py-5">
                    <h2 id="create-order-drawer-title" className="text-lg font-semibold text-primary">
                        Новый заказ
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-fg-quaternary transition-colors hover:bg-primary_hover hover:text-fg-primary"
                        aria-label="Закрыть"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                {/* key сбрасывает state формы при повторном открытии. */}
                <CreateOrderForm key={String(open)} onCancel={onClose} onCreated={onCreated} />
            </aside>
        </div>
    );
}

function CreateOrderForm({
    onCancel,
    onCreated,
}: {
    onCancel: () => void;
    onCreated: (order: Order) => void;
}) {
    const create = useCreateOrder();
    const couriersQuery = useActiveCouriers();
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [productDescription, setProductDescription] = useState("");
    const [comments, setComments] = useState("");
    const [price, setPrice] = useState("");
    const [priceError, setPriceError] = useState<string | null>(null);
    const [priority, setPriority] = useState<OrderPriority>("normal");
    // 'auto' = пустой courierId, backend сам выберет самого долго на базе.
    // Конкретный id = ручное назначение (backend пропустит auto-assign).
    const [assignMode, setAssignMode] = useState<"auto" | string>("auto");

    const errorMessage =
        create.error && isApiError(create.error) ? create.error.messages().join(". ") : null;
    const eligibleCouriers = useMemo(
        () => (couriersQuery.data ?? []).filter((c) => !c.isPaused),
        [couriersQuery.data],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Цена опциональна, но если введена — должна валидно парситься.
        // Backend ожидает строку (`IsNumberString`); запятую заменяем на точку
        // и нормализуем, чтобы не ловить 400 на "1 234,50".
        let normalizedPrice: string | undefined;
        const rawPrice = price.trim();
        if (rawPrice) {
            const candidate = rawPrice.replace(",", ".").replace(/\s+/g, "");
            if (!/^\d+(\.\d{1,2})?$/.test(candidate)) {
                setPriceError("Введите сумму в формате 1234.56");
                return;
            }
            normalizedPrice = candidate;
        }
        setPriceError(null);

        const input: CreateOrderInput = {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            deliveryAddress: deliveryAddress.trim(),
            productDescription: productDescription.trim(),
        };
        const trimmedComments = comments.trim();
        if (trimmedComments) input.comments = trimmedComments;
        if (normalizedPrice) input.price = normalizedPrice;
        input.priority = priority;
        if (assignMode !== "auto") input.courierId = assignMode;

        create.mutate(input, { onSuccess: onCreated });
    };

    const canSubmit =
        !create.isPending &&
        customerName.trim().length > 0 &&
        customerPhone.trim().length > 0 &&
        deliveryAddress.trim().length > 0 &&
        productDescription.trim().length > 0;

    return (
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 px-6 py-5">
                <Input
                    label="Имя клиента"
                    required
                    maxLength={256}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                    label="Телефон клиента"
                    type="tel"
                    required
                    maxLength={64}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <Input
                    label="Адрес доставки"
                    required
                    maxLength={1024}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                />
                <Input
                    label="Описание товара"
                    required
                    maxLength={1024}
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                />
                <Input
                    label="Комментарий"
                    maxLength={2048}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    hint="Необязательно"
                />
                <Input
                    label="Сумма заказа"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => {
                        setPrice(e.target.value);
                        if (priceError) setPriceError(null);
                    }}
                    hint="Необязательно. Пример: 1234.56"
                    error={priceError ?? undefined}
                />
                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="create-order-priority"
                        className="text-xs uppercase tracking-wide text-tertiary"
                    >
                        Приоритет
                    </label>
                    <select
                        id="create-order-priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as OrderPriority)}
                        disabled={create.isPending}
                        className="h-10 rounded-md border border-primary bg-primary px-3 text-sm text-primary shadow-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                    >
                        {(["low", "normal", "high"] as OrderPriority[]).map((p) => (
                            <option key={p} value={p}>
                                {ORDER_PRIORITY_LABELS[p]}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-tertiary">
                        Срочные заказы уходят быстрым и опытным курьерам и разбираются из очереди первыми.
                    </p>
                </div>
                <div className="flex flex-col gap-1">
                    <label
                        htmlFor="create-order-assign"
                        className="text-xs uppercase tracking-wide text-tertiary"
                    >
                        Назначение курьера
                    </label>
                    <select
                        id="create-order-assign"
                        value={assignMode}
                        onChange={(e) => setAssignMode(e.target.value)}
                        disabled={couriersQuery.isLoading || create.isPending}
                        className="h-10 rounded-md border border-primary bg-primary px-3 text-sm text-primary shadow-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                    >
                        <option value="auto">
                            Назначить автоматически (умный подбор курьера)
                        </option>
                        {eligibleCouriers.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.fullName}
                            </option>
                        ))}
                    </select>
                </div>
                {errorMessage ? <p className="text-sm text-error-primary">{errorMessage}</p> : null}
            </div>
            <div className="mt-auto flex justify-end gap-2 border-t border-secondary px-6 py-4">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={create.isPending}>
                    Отмена
                </Button>
                <Button type="submit" disabled={!canSubmit} isLoading={create.isPending}>
                    Создать
                </Button>
            </div>
        </form>
    );
}

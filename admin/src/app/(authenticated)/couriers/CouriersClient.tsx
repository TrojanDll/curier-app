"use client";

import {
    DotsHorizontal,
    Edit01,
    Key01,
    PauseCircle,
    PlayCircle,
    Plus,
    UserX01,
} from "@untitledui/icons";
import { useMemo, useState } from "react";
import { Button } from "@/components/base/Button";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/base/DropdownMenu";
import { CourierStatusBadge } from "@/components/data-display/StatusBadge";
import {
    computeCourierStatus,
    countActiveOrders,
    countDeliveriesLast24h,
} from "@/lib/courier-status";
import { MOCK_COURIERS } from "@/lib/mock/couriers";
import { MOCK_ORDERS } from "@/lib/mock/orders";
import type { Courier } from "@/types/courier";

type ToastKind = "info" | "success";

interface Toast {
    id: number;
    kind: ToastKind;
    text: string;
}

export function CouriersClient() {
    const [couriers, setCouriers] = useState<Courier[]>(MOCK_COURIERS);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (text: string, kind: ToastKind = "success") => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, text, kind }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    const handleTogglePause = (courier: Courier) => {
        setCouriers((prev) =>
            prev.map((c) => (c.id === courier.id ? { ...c, isPaused: !c.isPaused } : c)),
        );
        showToast(
            courier.isPaused
                ? `${courier.fullName} снят с паузы`
                : `${courier.fullName} поставлен на паузу`,
        );
    };

    const handleResetPassword = (courier: Courier) => {
        showToast(`Открытие формы сброса пароля для ${courier.fullName} (мок)`, "info");
    };

    const handleEdit = (courier: Courier) => {
        showToast(`Открытие формы редактирования ${courier.fullName} (мок)`, "info");
    };

    const handleFire = (courier: Courier) => {
        if (!confirm(`Уволить курьера ${courier.fullName}?`)) return;
        setCouriers((prev) =>
            prev.map((c) => (c.id === courier.id ? { ...c, isActive: false, isPaused: false } : c)),
        );
        showToast(`${courier.fullName} уволен`);
    };

    const handleAdd = () => {
        showToast("Форма добавления курьера откроется на Этапе 3", "info");
    };

    const rows = useMemo(() => {
        return couriers.map((courier) => ({
            courier,
            status: computeCourierStatus(courier, MOCK_ORDERS),
            activeOrders: countActiveOrders(courier.id, MOCK_ORDERS),
            deliveries24h: countDeliveriesLast24h(courier.id, MOCK_ORDERS),
        }));
    }, [couriers]);

    return (
        <div className="flex flex-col gap-4 px-8 py-6">
            <div className="flex items-center justify-end">
                <Button leftIcon={<Plus className="size-4" />} onClick={handleAdd}>
                    Добавить курьера
                </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-secondary bg-primary shadow-xs">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary">
                        <thead className="bg-secondary">
                            <tr className="text-left text-xs font-medium uppercase tracking-wide text-tertiary">
                                <th className="px-4 py-3">ФИО</th>
                                <th className="px-4 py-3">Логин</th>
                                <th className="px-4 py-3">Телефон</th>
                                <th className="px-4 py-3">Статус</th>
                                <th className="px-4 py-3 text-center">Активных</th>
                                <th className="px-4 py-3 text-center">Доставок за 24ч</th>
                                <th className="px-4 py-3 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-sm">
                            {rows.map(({ courier, status, activeOrders, deliveries24h }) => (
                                <tr key={courier.id}>
                                    <td className="px-4 py-3 font-medium text-primary">{courier.fullName}</td>
                                    <td className="px-4 py-3 text-tertiary">{courier.username}</td>
                                    <td className="px-4 py-3 text-tertiary">{courier.phone ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <CourierStatusBadge status={status} />
                                    </td>
                                    <td className="px-4 py-3 text-center tabular-nums">{activeOrders}</td>
                                    <td className="px-4 py-3 text-center tabular-nums">{deliveries24h}</td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu
                                            label={`Действия для ${courier.fullName}`}
                                            trigger={<DotsHorizontal className="size-5" />}
                                        >
                                            <DropdownItem
                                                icon={<Edit01 className="size-4" />}
                                                onSelect={() => handleEdit(courier)}
                                                disabled={!courier.isActive}
                                            >
                                                Редактировать
                                            </DropdownItem>
                                            <DropdownItem
                                                icon={
                                                    courier.isPaused ? (
                                                        <PlayCircle className="size-4" />
                                                    ) : (
                                                        <PauseCircle className="size-4" />
                                                    )
                                                }
                                                onSelect={() => handleTogglePause(courier)}
                                                disabled={!courier.isActive}
                                            >
                                                {courier.isPaused ? "Снять паузу" : "Поставить на паузу"}
                                            </DropdownItem>
                                            <DropdownItem
                                                icon={<Key01 className="size-4" />}
                                                onSelect={() => handleResetPassword(courier)}
                                                disabled={!courier.isActive}
                                            >
                                                Сбросить пароль
                                            </DropdownItem>
                                            <DropdownDivider />
                                            <DropdownItem
                                                icon={<UserX01 className="size-4" />}
                                                onSelect={() => handleFire(courier)}
                                                destructive
                                                disabled={!courier.isActive}
                                            >
                                                Уволить
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Toast region */}
            <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto rounded-md border border-secondary bg-primary px-4 py-2 text-sm text-primary shadow-lg"
                    >
                        {toast.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

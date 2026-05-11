"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { courierKeys } from "./keys";
import type { Courier } from "@/types/courier";

/**
 * Контракт `GET /api/admin/couriers` (см. docs/couriers.md).
 *
 * Здесь пока минимальный набор: список активных курьеров для dropdown-ов
 * (фильтр в таблице заказов + переназначение). Полноценные CRUD-хуки
 * появятся в §14.3.4.
 */
export interface CourierAdminDto {
    id: string;
    username: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    isActive: boolean;
    isPaused: boolean;
    lastReturnedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CouriersListResponseDto {
    items: CourierAdminDto[];
    total: number;
    page: number;
    pageSize: number;
}

function mapCourier(dto: CourierAdminDto): Courier {
    return {
        id: dto.id,
        username: dto.username,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth,
        isActive: dto.isActive,
        isPaused: dto.isPaused,
        lastReturnedAt: dto.lastReturnedAt,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
    };
}

/**
 * Активные (не уволенные) курьеры для dropdown-ов. На паузе — включены,
 * админ должен видеть всех живых, чтобы знать, кто доступен для
 * назначения. Сортировка по fullName asc.
 *
 * `staleTime: 60s` — список меняется редко; reassign и pause/resume в
 * других страницах не инвалидируют его автоматически (это сделает
 * §14.3.4 — там будут полные mutations).
 */
export function useActiveCouriers() {
    return useQuery({
        queryKey: courierKeys.activeOptions(),
        queryFn: async (): Promise<Courier[]> => {
            const { data } = await apiClient.get<CouriersListResponseDto>("/admin/couriers", {
                params: { pageSize: 100, sortBy: "fullName", order: "asc", status: "all" },
            });
            return data.items.filter((c) => c.isActive).map(mapCourier);
        },
        staleTime: 60_000,
    });
}

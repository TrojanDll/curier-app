"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { courierKeys, orderKeys } from "./keys";
import type { Courier, CourierDisplayStatus } from "@/types/courier";

/**
 * Контракт `/api/admin/couriers` (см. docs/couriers.md).
 *
 * Здесь два слоя:
 * — `useActiveCouriers` (lightweight selector для dropdown-ов на других страницах).
 * — Полный CRUD для страницы /couriers (§14.3.4): список + create + update +
 *   pause/resume + soft-delete + reset-password.
 *
 * Все mutations инвалидируют `courierKeys.lists()` и `courierKeys.activeOptions()`,
 * чтобы и таблица курьеров, и dropdown-ы в Orders подхватывали изменения. Кроме
 * того, `resume` дренит очередь заказов на backend-е (см. assignment.md), а pause
 * освобождает курьера — поэтому оба ещё инвалидируют `orderKeys.lists()`. Fire
 * не трогает orders.courier_id (soft delete оставляет историю назначений нетронутой,
 * см. couriers.md §Behaviour notes).
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
    pausedAt: string | null;
    lastResumedAt: string | null;
    firedAt: string | null;
    currentStatus: CourierDisplayStatus;
    currentStatusSince: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CouriersListResponseDto {
    items: CourierAdminDto[];
    total: number;
    page: number;
    pageSize: number;
}

export interface CouriersListResponse {
    items: Courier[];
    total: number;
    page: number;
    pageSize: number;
}

export type CouriersStatusFilter = "all" | "active" | "paused" | "disabled";
export type CouriersSortField =
    | "createdAt"
    | "fullName"
    | "username"
    | "lastReturnedAt";

export interface CouriersListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: CouriersSortField;
    order?: "asc" | "desc";
    status?: CouriersStatusFilter;
}

export interface CreateCourierInput {
    username: string;
    password: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
}

export interface UpdateCourierInput {
    username?: string;
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: string | null;
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
        pausedAt: dto.pausedAt,
        lastResumedAt: dto.lastResumedAt,
        firedAt: dto.firedAt,
        currentStatus: dto.currentStatus,
        currentStatusSince: dto.currentStatusSince,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
    };
}

function buildCouriersQueryParams(query: CouriersListQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (query.page !== undefined) params.page = query.page;
    if (query.pageSize !== undefined) params.pageSize = query.pageSize;
    if (query.search) params.search = query.search;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.order) params.order = query.order;
    if (query.status) params.status = query.status;
    return params;
}

/**
 * Полный список курьеров с пагинацией/поиском/фильтром по статусу для
 * страницы /couriers. `placeholderData: (prev) => prev` сохраняет
 * предыдущую страницу видимой при переключении, чтобы не было flash-а.
 */
export function useCouriers(query: CouriersListQuery) {
    return useQuery({
        queryKey: courierKeys.list(query),
        queryFn: async (): Promise<CouriersListResponse> => {
            const { data } = await apiClient.get<CouriersListResponseDto>("/admin/couriers", {
                params: buildCouriersQueryParams(query),
            });
            return {
                items: data.items.map(mapCourier),
                total: data.total,
                page: data.page,
                pageSize: data.pageSize,
            };
        },
        placeholderData: (previous) => previous,
    });
}

/**
 * Активные (не уволенные) курьеры для dropdown-ов на других страницах
 * (фильтр и переназначение в Orders). На паузе — включены, админ должен
 * видеть всех живых. Сортировка по fullName asc. `staleTime: 60s` — список
 * меняется редко; mutations в /couriers сами инвалидируют этот ключ.
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

function useInvalidateCouriers() {
    const queryClient = useQueryClient();
    return () => {
        queryClient.invalidateQueries({ queryKey: courierKeys.lists() });
        queryClient.invalidateQueries({ queryKey: courierKeys.activeOptions() });
    };
}

export function useCreateCourier() {
    const invalidate = useInvalidateCouriers();
    return useMutation({
        mutationFn: async (input: CreateCourierInput): Promise<Courier> => {
            const { data } = await apiClient.post<CourierAdminDto>("/admin/couriers", input);
            return mapCourier(data);
        },
        onSuccess: () => {
            invalidate();
        },
    });
}

interface UpdateCourierArgs {
    id: string;
    input: UpdateCourierInput;
}

export function useUpdateCourier() {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateCouriers();
    return useMutation({
        mutationFn: async ({ id, input }: UpdateCourierArgs): Promise<Courier> => {
            const { data } = await apiClient.patch<CourierAdminDto>(
                `/admin/couriers/${id}`,
                input,
            );
            return mapCourier(data);
        },
        onSuccess: (courier) => {
            queryClient.setQueryData(courierKeys.detail(courier.id), courier);
            invalidate();
        },
    });
}

/**
 * Pause освобождает курьера от auto-assign до явного resume. Pause
 * не отменяет уже назначенные заказы, поэтому orderKeys инвалидировать
 * не обязательно — но badge "статус" в drawer-ах заказов может зависеть
 * от is_paused, поэтому всё-таки инвалидируем для консистентности UI.
 */
export function usePauseCourier() {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateCouriers();
    return useMutation({
        mutationFn: async (id: string): Promise<Courier> => {
            const { data } = await apiClient.post<CourierAdminDto>(
                `/admin/couriers/${id}/pause`,
            );
            return mapCourier(data);
        },
        onSuccess: (courier) => {
            queryClient.setQueryData(courierKeys.detail(courier.id), courier);
            invalidate();
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        },
    });
}

/**
 * Resume снимает паузу и пытается выдать курьеру один заказ из очереди
 * (drain) — см. assignment.md. Поэтому обязательно инвалидируем
 * orderKeys: список заказов может моментально измениться (новый/назначен).
 */
export function useResumeCourier() {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateCouriers();
    return useMutation({
        mutationFn: async (id: string): Promise<Courier> => {
            const { data } = await apiClient.post<CourierAdminDto>(
                `/admin/couriers/${id}/resume`,
            );
            return mapCourier(data);
        },
        onSuccess: (courier) => {
            queryClient.setQueryData(courierKeys.detail(courier.id), courier);
            invalidate();
            queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
        },
    });
}

/**
 * Soft-delete: ставит is_active=false. Уволенный курьер не может
 * залогиниться, но orders.courier_id остаётся для истории.
 */
export function useFireCourier() {
    const queryClient = useQueryClient();
    const invalidate = useInvalidateCouriers();
    return useMutation({
        mutationFn: async (id: string): Promise<Courier> => {
            const { data } = await apiClient.delete<CourierAdminDto>(`/admin/couriers/${id}`);
            return mapCourier(data);
        },
        onSuccess: (courier) => {
            queryClient.setQueryData(courierKeys.detail(courier.id), courier);
            invalidate();
        },
    });
}

interface ResetPasswordArgs {
    id: string;
    newPassword: string;
}

/**
 * Сброс пароля. Backend в одной транзакции обновляет password_hash и
 * аннулирует refresh_tokens этого курьера (см. couriers.md). Ответ 204
 * без тела — клиенту достаточно знать, что не упало.
 */
export function useResetCourierPassword() {
    return useMutation({
        mutationFn: async ({ id, newPassword }: ResetPasswordArgs): Promise<void> => {
            await apiClient.post(`/admin/couriers/${id}/reset-password`, { newPassword });
        },
    });
}

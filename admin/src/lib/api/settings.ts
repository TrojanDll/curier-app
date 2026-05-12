"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { settingsKeys } from "./keys";

/**
 * Контракт `/api/admin/settings` (см. docs/settings.md).
 *
 * Один резурс (не список) — backend хранит app-wide настройки в singleton-row
 * `app_settings`. `useSettings` — GET, `useUpdateSettings` — PATCH с
 * частичным апдейтом (поле опционально). Хук смены пароля админа
 * (`useChangeAdminPassword`) живёт здесь же, потому что страница /settings
 * — единственный потребитель; перенесём в use-auth.ts, если появится
 * второе место вызова.
 */

export interface AppSettingsDto {
    photoTtlDays: number;
    /**
     * Свободный текст с контактом диспетчера/поддержки. Курьер видит его на
     * своём экране Profile (§7.8). `null` — поле не настроено, на курьере
     * показываем дефолтный hint.
     */
    supportContact: string | null;
    updatedAt: string;
}

/** Идентичен DTO — отдельный type оставляем на случай будущих маппингов. */
export type AppSettings = AppSettingsDto;

export interface UpdateSettingsInput {
    photoTtlDays?: number;
    /** `null` очищает поле; пропуск оставляет как есть. */
    supportContact?: string | null;
}

/**
 * Один объект настроек на инсталляцию. `staleTime: 60s` — настройки
 * меняются вручную из UI и потребители не критичны к мгновенной свежести
 * (TTL действует на следующую загрузку фото, не ретроактивно). После
 * успешного PATCH мутация кладёт свежий ответ в кеш напрямую.
 */
export function useSettings() {
    return useQuery({
        queryKey: settingsKeys.current(),
        queryFn: async (): Promise<AppSettings> => {
            const { data } = await apiClient.get<AppSettingsDto>("/admin/settings");
            return data;
        },
        staleTime: 60_000,
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: UpdateSettingsInput): Promise<AppSettings> => {
            const { data } = await apiClient.patch<AppSettingsDto>(
                "/admin/settings",
                input,
            );
            return data;
        },
        onSuccess: (settings) => {
            queryClient.setQueryData(settingsKeys.current(), settings);
        },
    });
}

export interface ChangeAdminPasswordInput {
    currentPassword: string;
    newPassword: string;
}

/**
 * Сменить пароль текущего администратора. Backend на успехе возвращает 204
 * и отзывает все refresh-токены этого админа — поэтому на следующем 401
 * BFF попытается обновиться и провалится, что приведёт к редиректу на
 * /login. Это поведение задумано (см. auth.md / change-password §).
 */
export function useChangeAdminPassword() {
    return useMutation({
        mutationFn: async (input: ChangeAdminPasswordInput): Promise<void> => {
            await apiClient.post("/auth/admin/change-password", input);
        },
    });
}

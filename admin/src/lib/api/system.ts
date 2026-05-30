"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { systemKeys } from "./keys";

/**
 * Self-update серверного стека (`/api/admin/system/*`, см. docs/self-update.md).
 * `version` — сравнение текущей версии с последним GitHub-релизом; `update` —
 * кладёт триггер для sidecar-updater; `update/status` — опрос прогресса.
 */

export type UpdatePhase = "idle" | "in_progress" | "success" | "failed";

export interface StackVersionInfo {
    current: string;
    latest: string | null;
    updateAvailable: boolean;
    latestNotes: string | null;
    latestUrl: string | null;
    publishedAt: string | null;
}

export interface UpdateStatus {
    status: UpdatePhase;
    startedAt: string | null;
    finishedAt: string | null;
    log: string;
}

export function useStackVersion() {
    return useQuery({
        queryKey: systemKeys.version(),
        queryFn: async (): Promise<StackVersionInfo> => {
            const { data } = await apiClient.get<StackVersionInfo>("/admin/system/version");
            return data;
        },
        staleTime: 60_000,
        // Лёгкий фоновый поллинг: оператор заметит новую версию в течение ~15 мин
        // даже при непрерывной работе без перезагрузки. Чаще смысла нет — backend
        // кэширует список релизов GitHub 5 мин.
        refetchInterval: 15 * 60_000,
    });
}

/**
 * Принудительная проверка обновлений по кнопке «Проверить обновления».
 * Шлёт `?force=1` — backend обходит свой 5-минутный кэш и ходит в GitHub
 * напрямую. Результат кладём в кэш `systemKeys.version()`, чтобы и страница,
 * и бейдж в сайдбаре сразу увидели свежую версию. Фоновый поллинг
 * (`useStackVersion`) при этом остаётся кэшированным — лимит API не страдает.
 */
export function useCheckStackVersion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<StackVersionInfo> => {
            const { data } = await apiClient.get<StackVersionInfo>(
                "/admin/system/version",
                { params: { force: 1 } },
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(systemKeys.version(), data);
        },
    });
}

export function useTriggerStackUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<{ started: boolean; status: UpdatePhase }> => {
            const { data } = await apiClient.post<{ started: boolean; status: UpdatePhase }>(
                "/admin/system/update",
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: systemKeys.updateStatus() });
        },
    });
}

/**
 * Статус обновления. Опрашивается каждые 4с, пока `enabled`. `retry: false` —
 * во время апдейта backend/admin перезапускаются, запросы будут падать; это
 * ожидаемо, не нужно ретраить агрессивно.
 */
export function useStackUpdateStatus(enabled: boolean) {
    return useQuery({
        queryKey: systemKeys.updateStatus(),
        queryFn: async (): Promise<UpdateStatus> => {
            const { data } = await apiClient.get<UpdateStatus>("/admin/system/update/status");
            return data;
        },
        enabled,
        refetchInterval: enabled ? 4000 : false,
        retry: false,
    });
}

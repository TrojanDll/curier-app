"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { backupKeys } from "./keys";

/**
 * Резервное копирование данных (`/api/admin/backups/*`, см. docs/backups.md).
 *
 * Бэкап — это один портируемый ZIP (таблицы БД в JSON + файлы фото). История
 * хранится в файловой системе backend-а (volume `backups`), поэтому
 * восстановление не затирает сам список бэкапов.
 *
 * Скачивание/экспорт — это не хук, а прямая ссылка на BFF-эндпоинт
 * (`backupDownloadUrl`): браузер сам отправит HttpOnly-cookie, BFF подставит
 * Bearer, backend отдаст файл с `Content-Disposition: attachment`.
 */

export type BackupOrigin = "manual" | "imported" | "pre-restore";

export interface BackupCounts {
    admins: number;
    couriers: number;
    orders: number;
    orderPhotos: number;
    appSettings: number;
}

export interface BackupMeta {
    id: string;
    fileName: string;
    /** Когда файл появился на этой инсталляции (создан/импортирован). */
    createdAt: string;
    /** Момент снимка данных (для импортированных — оригинальный). */
    contentCreatedAt: string;
    sizeBytes: number;
    formatVersion: number;
    stackVersion: string;
    counts: BackupCounts;
    photoCount: number;
    photoBytes: number;
    origin: BackupOrigin;
    /** Логин админа, либо `system` для авто-снимков. */
    createdBy: string | null;
    note: string | null;
}

export interface RestoreResult {
    restored: true;
    restoredFrom: string;
    safetySnapshotId: string;
    counts: BackupCounts;
}

/** История бэкапов, свежие сверху. */
export function useBackups() {
    return useQuery({
        queryKey: backupKeys.list(),
        queryFn: async (): Promise<BackupMeta[]> => {
            const { data } = await apiClient.get<BackupMeta[]>("/admin/backups");
            return data;
        },
        staleTime: 10_000,
    });
}

/** Создать бэкап текущего состояния прямо сейчас. */
export function useCreateBackup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (note?: string | null): Promise<BackupMeta> => {
            const { data } = await apiClient.post<BackupMeta>("/admin/backups", {
                note: note ?? null,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: backupKeys.all });
        },
    });
}

/**
 * Восстановиться из бэкапа. Деструктивно: backend сначала делает авто-снимок
 * текущего состояния (`safetySnapshotId`), затем заменяет все таблицы и фото.
 * После успеха сбрасываем ВЕСЬ кеш — поменялось всё.
 */
export function useRestoreBackup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string): Promise<RestoreResult> => {
            const { data } = await apiClient.post<RestoreResult>(
                `/admin/backups/${id}/restore`,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries();
        },
    });
}

/** Удалить бэкап из истории. */
export function useDeleteBackup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            await apiClient.delete(`/admin/backups/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: backupKeys.all });
        },
    });
}

/** Импортировать бэкап из ZIP-файла (multipart, поле `file`). */
export function useImportBackup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (file: File): Promise<BackupMeta> => {
            const form = new FormData();
            form.append("file", file);
            const { data } = await apiClient.post<BackupMeta>(
                "/admin/backups/import",
                form,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: backupKeys.all });
        },
    });
}

/** Same-origin BFF-ссылка для скачивания/экспорта архива. */
export function backupDownloadUrl(id: string): string {
    return `/api/admin/backups/${id}/download`;
}

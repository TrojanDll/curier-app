"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { appReleaseKeys } from "./keys";

/**
 * Контракт /api/admin/app-releases (см. backend AppReleasesModule).
 * Управление версиями Android-приложения для in-app обновления: список
 * загруженных APK, загрузка нового (multipart), удаление.
 */
export interface AppReleaseDto {
    id: string;
    versionCode: number;
    versionName: string;
    releaseNotes: string | null;
    fileSize: number;
    sha256: string;
    isMandatory: boolean;
    gitCommit: string | null;
    downloadUrl: string;
    createdAt: string;
}

export interface UploadAppReleaseInput {
    file: File;
    versionCode: number;
    versionName: string;
    releaseNotes?: string;
    isMandatory?: boolean;
}

/** Список загруженных версий, новые сверху. */
export function useAppReleases() {
    return useQuery({
        queryKey: appReleaseKeys.lists(),
        queryFn: async (): Promise<AppReleaseDto[]> => {
            const { data } = await apiClient.get<AppReleaseDto[]>("/admin/app-releases");
            return data;
        },
        staleTime: 30_000,
    });
}

/**
 * Загрузка нового APK. multipart/form-data — Content-Type axios выставит сам
 * с boundary (вручную задавать нельзя). `timeout: 0` — APK крупный, дефолтные
 * таймауты не должны рвать долгую заливку по медленному каналу.
 */
export function useUploadAppRelease() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: UploadAppReleaseInput): Promise<AppReleaseDto> => {
            const fd = new FormData();
            fd.append("apk", input.file);
            fd.append("versionCode", String(input.versionCode));
            fd.append("versionName", input.versionName);
            if (input.releaseNotes) fd.append("releaseNotes", input.releaseNotes);
            if (input.isMandatory) fd.append("isMandatory", "true");
            const { data } = await apiClient.post<AppReleaseDto>(
                "/admin/app-releases",
                fd,
                { timeout: 0 },
            );
            return data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: appReleaseKeys.lists() });
        },
    });
}

export function useDeleteAppRelease() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string): Promise<void> => {
            await apiClient.delete(`/admin/app-releases/${id}`);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: appReleaseKeys.lists() });
        },
    });
}

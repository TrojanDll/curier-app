"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { apiClient } from "@/lib/api";

/** Профиль администратора, который backend возвращает на /auth/admin/login. */
export interface AdminUser {
    id: string;
    username: string;
    fullName: string;
}

const STORAGE_KEY = "admin-user";

// useSyncExternalStore требует, чтобы getSnapshot возвращал стабильный
// ref между рендерами, иначе будет infinite loop. Кэшируем по сырой строке.
let cachedRaw: string | null = null;
let cachedUser: AdminUser | null = null;

function readStored(): AdminUser | null {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedUser;
    cachedRaw = raw;
    if (!raw) {
        cachedUser = null;
        return null;
    }
    try {
        cachedUser = JSON.parse(raw) as AdminUser;
    } catch {
        cachedUser = null;
    }
    return cachedUser;
}

function writeStored(user: AdminUser | null): void {
    if (typeof window === "undefined") return;
    if (user === null) {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
    // useSyncExternalStore слушает событие `storage`, но оно стреляет только
    // в ДРУГИХ табах. Свой таб синхронизируем вручную через CustomEvent.
    window.dispatchEvent(new CustomEvent(STORE_EVENT));
}

const STORE_EVENT = "admin-user-changed";

function subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener("storage", callback);
    window.addEventListener(STORE_EVENT, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(STORE_EVENT, callback);
    };
}

/**
 * Текущий администратор для UI (имя в шапке/sidebar). Источник правды —
 * sessionStorage, заполняется в useLogin и чистится в useLogout. При
 * перезагрузке вкладки восстанавливается мгновенно (без spinner-а).
 *
 * Реальные права проверяются backend-ом при каждом запросе через BFF.
 */
export function useUser(): AdminUser | null {
    return useSyncExternalStore(subscribe, readStored, () => null);
}

interface LoginInput {
    username: string;
    password: string;
}

interface LoginResponse {
    user: AdminUser;
}

export function useLogin() {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: LoginInput) => {
            const { data } = await apiClient.post<LoginResponse>("/auth/login", input);
            return data.user;
        },
        onSuccess: (user) => {
            writeStored(user);
            queryClient.clear();
        },
        onSettled: () => {
            // router.refresh() заставит proxy/middleware повторно проверить cookie.
            router.refresh();
        },
    });
}

export function useLogout() {
    const router = useRouter();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await apiClient.post("/auth/logout").catch(() => undefined);
        },
        onSettled: () => {
            writeStored(null);
            queryClient.clear();
            router.replace("/login");
            router.refresh();
        },
    });
}

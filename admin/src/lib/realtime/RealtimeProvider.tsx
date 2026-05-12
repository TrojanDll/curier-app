"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { courierKeys, orderKeys, statisticsKeys } from "@/lib/api";
import { useUser } from "@/lib/auth/use-auth";

/**
 * Открывает Socket.IO-соединение к backend (`/realtime`) и сбрасывает
 * соответствующие react-query кеши при server-side событиях.
 *
 * Стратегия — invalidate, не setQueryData: payload событий совпадает с
 * REST DTO (см. `docs/realtime.md`), но списки могут отличаться по
 * сортировке/пагинации, и точечный merge потребует дублирования мапперов.
 * Сетевые refetch-и стоят дёшево на десятках/сотнях заказов и
 * исключают рассинхрон между live-данными и фильтрованным view.
 *
 * JWT берётся через BFF `/api/realtime/token` — HttpOnly cookie клиенту
 * недоступен. При `connect_error` с маркером "Unauthorized" токен
 * перезапрашивается (BFF параллельно делает silent refresh, если access
 * истёк), и socket.io переоткроет соединение с новым `auth.token`.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
    const user = useUser();
    // `useQueryClient()` отдаёт singleton от QueryProvider → ссылочно
    // стабилен, безопасно передавать в deps без ref-обёртки.
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user) return;

        let socket: Socket | null = null;
        let cancelled = false;

        async function open() {
            const initial = await fetchToken();
            if (cancelled || !initial) return;

            socket = io(`${initial.url}/realtime`, {
                auth: { token: initial.token },
                transports: ["websocket"],
                reconnection: true,
                reconnectionDelay: 1_000,
                reconnectionDelayMax: 10_000,
            });

            socket.on("connect", () => {
                // После (пере)подключения инвалидируем основные списки —
                // во время разрыва могли пропустить события.
                queryClient.invalidateQueries({ queryKey: orderKeys.all });
                queryClient.invalidateQueries({ queryKey: courierKeys.all });
                queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
            });

            socket.on("orders:updated", (payload: { id?: string } | undefined) => {
                queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
                if (payload?.id) {
                    queryClient.invalidateQueries({ queryKey: orderKeys.detail(payload.id) });
                }
                queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
            });

            socket.on("couriers:status", (payload: { id?: string } | undefined) => {
                queryClient.invalidateQueries({ queryKey: courierKeys.lists() });
                queryClient.invalidateQueries({ queryKey: courierKeys.activeOptions() });
                if (payload?.id) {
                    queryClient.invalidateQueries({ queryKey: courierKeys.detail(payload.id) });
                }
            });

            socket.on("connect_error", async (err: Error) => {
                // Auth-провал → запросить свежий токен у BFF (он сам ротейтит).
                if (!socket || !err?.message?.startsWith("Unauthorized")) return;
                const fresh = await fetchToken();
                if (fresh) socket.auth = { token: fresh.token };
            });
        }

        open();

        return () => {
            cancelled = true;
            socket?.removeAllListeners();
            socket?.disconnect();
        };
    }, [user, queryClient]);

    return <>{children}</>;
}

interface RealtimeHandshake {
    token: string;
    url: string;
}

async function fetchToken(): Promise<RealtimeHandshake | null> {
    const res = await fetch("/api/realtime/token", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
    }).catch(() => null);
    if (!res || !res.ok) return null;
    return (await res.json().catch(() => null)) as RealtimeHandshake | null;
}

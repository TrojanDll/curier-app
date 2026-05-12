/**
 * Origin для Socket.IO. Браузер открывает соединение НАПРЯМУЮ к backend
 * (через BFF WebSocket не проксируется), поэтому URL выдаётся клиенту
 * вместе с токеном через `/api/realtime/token`.
 *
 * В dev по умолчанию `http://localhost:8081`. В prod (Stage 5) задаётся
 * через `BACKEND_REALTIME_URL`. Серверная переменная — она НЕ попадает
 * в client bundle (нет префикса NEXT_PUBLIC_).
 */
const DEFAULT_REALTIME_URL = "http://localhost:8081";

export function getRealtimeUrl(): string {
    const fromEnv = process.env.BACKEND_REALTIME_URL?.replace(/\/+$/, "");
    return fromEnv || DEFAULT_REALTIME_URL;
}

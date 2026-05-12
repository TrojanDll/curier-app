import { NextResponse, type NextRequest } from "next/server";
import {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    clearAuthCookies,
    setAuthCookies,
} from "@/lib/server/auth-cookies";
import { getBackendBaseUrl } from "@/lib/server/backend";
import { getRealtimeUrl } from "@/lib/server/realtime";

/**
 * BFF endpoint для Socket.IO handshake. Возвращает текущий access JWT
 * (из HttpOnly cookie) плюс URL backend-а — браузеру они оба нужны для
 * `io(url, { auth: { token } })`.
 *
 * При отсутствии access cookie или 401 на тестовом запросе пытается
 * silently rotate refresh-токен (та же логика, что в `[...path]/route.ts`),
 * чтобы клиент не получил протухший JWT и не уехал в connect_error loop.
 *
 * Тестовый запрос намеренно не делаем — JWT валидируется backend-ом
 * во время WS handshake; если access JWT просто свежий, отдадим его,
 * клиент сам поймает connect_error при истечении и заново запросит.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    let accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    let rotated: { access: string; refresh: string } | null = null;

    if (!accessToken && refreshToken) {
        rotated = await rotateTokens(refreshToken);
        if (rotated) accessToken = rotated.access;
    }

    if (!accessToken) {
        const res = NextResponse.json(
            { statusCode: 401, message: "Unauthorized", error: "Unauthorized" },
            { status: 401 },
        );
        if (refreshToken && !rotated) clearAuthCookies(res);
        return res;
    }

    const res = NextResponse.json({
        token: accessToken,
        url: getRealtimeUrl(),
    });
    if (rotated) setAuthCookies(res, { accessToken: rotated.access, refreshToken: rotated.refresh });
    return res;
}

async function rotateTokens(
    refreshToken: string,
): Promise<{ access: string; refresh: string } | null> {
    const r = await fetch(`${getBackendBaseUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
    }).catch(() => null);
    if (!r || !r.ok) return null;
    const data = (await r.json().catch(() => null)) as
        | { accessToken: string; refreshToken: string }
        | null;
    if (!data?.accessToken || !data.refreshToken) return null;
    return { access: data.accessToken, refresh: data.refreshToken };
}

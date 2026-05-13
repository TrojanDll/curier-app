import type { NextResponse } from "next/server";

/**
 * Names of the HttpOnly cookies that BFF route handlers set on login /
 * refresh and clear on logout. Centralised so middleware/proxy reads
 * exactly the same name BFF writes.
 */
export const ACCESS_COOKIE_NAME = "admin-access";
export const REFRESH_COOKIE_NAME = "admin-refresh";

/**
 * Cookies live for 30 days regardless of JWT TTL.
 *
 * The access JWT itself expires after 15 minutes (JWT_ACCESS_TTL on
 * backend). When backend returns 401, the catch-all BFF proxy silently
 * exchanges the refresh cookie for a new pair and overwrites both
 * cookies — so the access cookie outliving its embedded JWT is fine.
 *
 * Same maxAge for refresh because backend itself enforces the 30d
 * refresh TTL via JWT_REFRESH_TTL.
 */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * Attaches `Set-Cookie` headers for both HttpOnly tokens.
 *
 * `Secure` is on by default in production — but it breaks plain-HTTP
 * deploys (browsers silently drop Secure cookies over http://). Opt out
 * with `INSECURE_COOKIES=1` on the admin container when the stack is
 * fronted by HTTP only. Production with HTTPS leaves the flag unset
 * and gets the secure default.
 */
export function setAuthCookies(res: NextResponse, tokens: AuthTokens): void {
    const isProd = process.env.NODE_ENV === "production";
    const insecureOptIn = process.env.INSECURE_COOKIES === "1";
    const base = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: isProd && !insecureOptIn,
        path: "/",
        maxAge: COOKIE_MAX_AGE_SECONDS,
    };
    res.cookies.set({ name: ACCESS_COOKIE_NAME, value: tokens.accessToken, ...base });
    res.cookies.set({ name: REFRESH_COOKIE_NAME, value: tokens.refreshToken, ...base });
}

export function clearAuthCookies(res: NextResponse): void {
    res.cookies.set({ name: ACCESS_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
    res.cookies.set({ name: REFRESH_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
}

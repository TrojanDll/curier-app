import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE_NAME, clearAuthCookies } from "@/lib/server/auth-cookies";
import { getBackendBaseUrl } from "@/lib/server/backend";

/**
 * Browser → POST /api/auth/logout. We forward the refresh token from
 * the HttpOnly cookie to backend so it can revoke it, then clear both
 * cookies regardless of backend response (logout is idempotent — even
 * if the network fails the user must end up logged out on the client).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (refreshToken) {
        await fetch(`${getBackendBaseUrl()}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            cache: "no-store",
        }).catch(() => null);
    }

    const res = new NextResponse(null, { status: 204 });
    clearAuthCookies(res);
    return res;
}

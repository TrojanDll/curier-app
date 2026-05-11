import { NextResponse, type NextRequest } from "next/server";
import { setAuthCookies } from "@/lib/server/auth-cookies";
import { getBackendBaseUrl } from "@/lib/server/backend";

interface BackendLoginResponse {
    accessToken: string;
    refreshToken: string;
    user: { id: string; username: string; fullName: string };
}

/**
 * BFF for the admin login form.
 *
 * Browser → POST /api/auth/login with {username, password}.
 * Backend response includes tokens + AdminProfile. We strip the tokens
 * into HttpOnly cookies and return only the profile to the browser.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { statusCode: 400, message: "Invalid JSON body", error: "Bad Request" },
            { status: 400 },
        );
    }

    const backendRes = await fetch(`${getBackendBaseUrl()}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
    });

    const payload = (await backendRes.json().catch(() => null)) as unknown;

    if (!backendRes.ok) {
        return NextResponse.json(payload ?? { statusCode: backendRes.status }, {
            status: backendRes.status,
        });
    }

    const data = payload as BackendLoginResponse;
    const res = NextResponse.json({ user: data.user });
    setAuthCookies(res, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    return res;
}

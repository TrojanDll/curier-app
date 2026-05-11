import { NextResponse, type NextRequest } from "next/server";
import {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    clearAuthCookies,
    setAuthCookies,
} from "@/lib/server/auth-cookies";
import { getBackendBaseUrl } from "@/lib/server/backend";

/**
 * Catch-all BFF proxy. Browser → /api/<anything>, we forward to
 * NestJS with `Authorization: Bearer <access>` taken from the HttpOnly
 * cookie. On a 401 we silently exchange the refresh cookie for a new
 * token pair (rotation) and retry the original request once.
 *
 * `app/api/auth/login` and `app/api/auth/logout` are more specific
 * file-system routes and short-circuit before this handler.
 */

interface ProxyContext {
    params: Promise<{ path: string[] }>;
}

const PASS_THROUGH_REQUEST_HEADERS = new Set([
    "content-type",
    "x-request-id",
    "accept",
    "accept-language",
]);
const STRIP_RESPONSE_HEADERS = new Set([
    "transfer-encoding",
    "connection",
    "keep-alive",
    "content-encoding",
    "content-length",
]);

const UNAUTHENTICATED_PATHS = new Set(["auth/refresh"]);

async function handle(request: NextRequest, ctx: ProxyContext): Promise<NextResponse> {
    const { path } = await ctx.params;
    const joined = path.join("/");

    // Block direct access to refresh — it's an internal BFF mechanism.
    if (UNAUTHENTICATED_PATHS.has(joined)) {
        return NextResponse.json(
            { statusCode: 404, message: "Not Found", error: "Not Found" },
            { status: 404 },
        );
    }

    const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
    if (!accessToken) {
        return NextResponse.json(
            { statusCode: 401, message: "Unauthorized", error: "Unauthorized" },
            { status: 401 },
        );
    }

    const targetUrl = `${getBackendBaseUrl()}/${joined}${request.nextUrl.search}`;
    const body = await readBody(request);
    const baseHeaders = pickHeaders(request.headers, PASS_THROUGH_REQUEST_HEADERS);

    let backendRes = await forward(targetUrl, request.method, baseHeaders, body, accessToken);

    let rotated: { access: string; refresh: string } | null = null;

    if (backendRes.status === 401) {
        const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
        if (refreshToken) {
            rotated = await rotateTokens(refreshToken);
            if (rotated) {
                backendRes = await forward(
                    targetUrl,
                    request.method,
                    baseHeaders,
                    body,
                    rotated.access,
                );
            }
        }
    }

    const responseHeaders = filteredHeaders(backendRes.headers, STRIP_RESPONSE_HEADERS);
    const buffer = await backendRes.arrayBuffer();
    const out = new NextResponse(buffer.byteLength === 0 ? null : buffer, {
        status: backendRes.status,
        headers: responseHeaders,
    });

    if (rotated) {
        setAuthCookies(out, { accessToken: rotated.access, refreshToken: rotated.refresh });
    } else if (backendRes.status === 401 && request.cookies.get(REFRESH_COOKIE_NAME)?.value) {
        // Refresh did not help — wipe cookies so the next page load redirects to /login.
        clearAuthCookies(out);
    }

    return out;
}

async function readBody(request: NextRequest): Promise<ArrayBuffer | undefined> {
    if (request.method === "GET" || request.method === "HEAD") return undefined;
    const buf = await request.arrayBuffer();
    return buf.byteLength === 0 ? undefined : buf;
}

function pickHeaders(src: Headers, allow: Set<string>): Headers {
    const out = new Headers();
    src.forEach((value, key) => {
        if (allow.has(key.toLowerCase())) out.set(key, value);
    });
    return out;
}

function filteredHeaders(src: Headers, deny: Set<string>): Headers {
    const out = new Headers();
    src.forEach((value, key) => {
        if (!deny.has(key.toLowerCase())) out.set(key, value);
    });
    return out;
}

async function forward(
    url: string,
    method: string,
    baseHeaders: Headers,
    body: ArrayBuffer | undefined,
    accessToken: string,
): Promise<Response> {
    const headers = new Headers(baseHeaders);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, {
        method,
        headers,
        body,
        cache: "no-store",
    });
}

async function rotateTokens(refreshToken: string): Promise<{ access: string; refresh: string } | null> {
    const res = await fetch(`${getBackendBaseUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
    }).catch(() => null);
    if (!res || !res.ok) return null;

    const data = (await res.json().catch(() => null)) as
        | { accessToken: string; refreshToken: string }
        | null;
    if (!data?.accessToken || !data.refreshToken) return null;
    return { access: data.accessToken, refresh: data.refreshToken };
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;

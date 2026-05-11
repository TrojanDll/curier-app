import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME } from "@/lib/server/auth-cookies";

const PUBLIC_PATHS = new Set(["/login"]);

/**
 * Next.js 16 переименовал `middleware` в `proxy`. См.
 * https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 *
 * Cookie проверяется только на наличие — JWT валидируется backend-ом
 * при следующем запросе через BFF (`app/api/[...path]/route.ts`).
 * Если access-cookie протух, но refresh-cookie живая, BFF молча
 * обновит пару при первом же fetch.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isAuthenticated = Boolean(request.cookies.get(ACCESS_COOKIE_NAME)?.value);

    if (isAuthenticated && PUBLIC_PATHS.has(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    if (!isAuthenticated && !PUBLIC_PATHS.has(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/.*).*)"],
};

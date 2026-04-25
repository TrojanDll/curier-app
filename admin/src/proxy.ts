import { NextResponse, type NextRequest } from "next/server";

/**
 * Cookie с JWT админа. На Этапе 1 (моки) cookie выставляется страницей
 * /login без реальной проверки. На Этапе 3 будет содержать валидный
 * access-token, валидируемый backend-ом.
 */
const AUTH_COOKIE = "admin-auth-token";

/**
 * Маршруты, доступные без авторизации.
 */
const PUBLIC_PATHS = new Set(["/login"]);

/**
 * Next.js 16 переименовал `middleware` в `proxy`.
 * См. https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isAuthenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

    // Авторизованного юзера с /login отправляем на главную.
    if (isAuthenticated && PUBLIC_PATHS.has(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    // Неавторизованного — на /login (с сохранением исходного пути).
    if (!isAuthenticated && !PUBLIC_PATHS.has(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

/**
 * Не запускаем proxy для статики Next.js, API-роутов и фавиконов.
 */
export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/.*).*)"],
};

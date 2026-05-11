import axios, { type AxiosInstance } from "axios";
import { toApiError } from "./errors";

const DEFAULT_BASE_URL = "http://localhost:8081";

function resolveBaseUrl(): string {
    // NEXT_PUBLIC_* инлайнится в браузерный bundle; на SSR читается из process.env.
    const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
    return fromEnv || DEFAULT_BASE_URL;
}

/**
 * Глобальный axios instance. Backend монтирует все ручки под `/api`,
 * поэтому prefix зашит в baseURL — вызовы выглядят как
 * `apiClient.get("/admin/orders")`, без повтора `/api/` в каждом месте.
 *
 * Auth-interceptor (Bearer + 401-refresh ротация) приедет в §14.3.2.
 */
export const apiClient: AxiosInstance = axios.create({
    baseURL: `${resolveBaseUrl()}/api`,
});

// Любая ошибка из axios превращается в ApiError ещё в interceptor,
// чтобы вызывающий код не разбирался с двумя разными типами.
apiClient.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(toApiError(error)),
);

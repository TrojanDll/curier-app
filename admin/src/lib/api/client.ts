import axios, { type AxiosInstance } from "axios";
import { toApiError } from "./errors";

/**
 * Глобальный axios instance. Клиент всегда стучится на same-origin
 * `/api/*` — Next BFF (`app/api/[...path]/route.ts`) проксирует на
 * backend, подмешивая Authorization из HttpOnly cookie и делая silent
 * refresh при 401.
 *
 * Поэтому здесь не нужны ни `withCredentials`, ни request interceptor:
 * cookies same-origin отправляются автоматически.
 */
export const apiClient: AxiosInstance = axios.create({
    baseURL: "/api",
});

apiClient.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(toApiError(error)),
);

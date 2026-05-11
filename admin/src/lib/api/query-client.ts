import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

/**
 * Дефолты для всех query/mutation в админке.
 *
 * `staleTime: 30s` — таблицы заказов и курьеров обновляются также по
 * Socket.IO (§14.3.7), поэтому агрессивный refetch не нужен.
 * Retry отключён для 4xx — нет смысла повторять Unauthorized или
 * Validation errors; для 5xx — одна попытка.
 */
export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                retry: (failureCount, error) => {
                    if (isApiError(error) && error.status >= 400 && error.status < 500) {
                        return false;
                    }
                    return failureCount < 1;
                },
                refetchOnWindowFocus: false,
            },
            mutations: {
                retry: 0,
            },
        },
    });
}

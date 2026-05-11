/**
 * Query key factories для react-query.
 *
 * Иерархия `[resource, "list" | "detail", ...params]` нужна для точечной
 * инвалидации — например, mutation reassign-а заказа сбрасывает только
 * `orderKeys.lists()` и `orderKeys.detail(id)`, а кеши курьеров и
 * статистики остаются прогретыми.
 *
 * Стабильность параметров в ключе обеспечивает react-query: объекты
 * сравниваются по структурному эквиваленту, не по ref.
 */

/**
 * Параметр `query` маркируется как `unknown`, чтобы избежать конфликта
 * между типизированными интерфейсами (OrdersListQuery / CouriersListQuery
 * и т.п.) и универсальной сигнатурой `Record<string, unknown>`. Внутри
 * react-query всё равно сравнивает структурно (deep equal).
 */

export const orderKeys = {
    all: ["orders"] as const,
    lists: () => [...orderKeys.all, "list"] as const,
    list: (query: unknown) => [...orderKeys.lists(), query] as const,
    details: () => [...orderKeys.all, "detail"] as const,
    detail: (id: string) => [...orderKeys.details(), id] as const,
};

export const courierKeys = {
    all: ["couriers"] as const,
    lists: () => [...courierKeys.all, "list"] as const,
    list: (query: unknown) => [...courierKeys.lists(), query] as const,
    /** Лёгкий список активных курьеров для dropdown-ов (фильтр + reassign). */
    activeOptions: () => [...courierKeys.all, "active-options"] as const,
    details: () => [...courierKeys.all, "detail"] as const,
    detail: (id: string) => [...courierKeys.details(), id] as const,
};

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

/**
 * Statistics — два read-only endpoint-а. Разные ключи под разные query,
 * чтобы переключение period не сбрасывало второй кеш. На §14.3.7 Socket.IO
 * будет инвалидировать `statisticsKeys.all` целиком, когда меняются заказы.
 */
export const statisticsKeys = {
    all: ["statistics"] as const,
    overview: (query: unknown) => [...statisticsKeys.all, "overview", query] as const,
    couriers: (query: unknown) => [...statisticsKeys.all, "couriers", query] as const,
};

/**
 * Settings — singleton resource. `current()` достаточно одного, но
 * иерархия `["settings", "current"]` оставляет место для будущих
 * подпунктов (например, истории изменений) без коллизии ключей.
 */
export const settingsKeys = {
    all: ["settings"] as const,
    current: () => [...settingsKeys.all, "current"] as const,
};

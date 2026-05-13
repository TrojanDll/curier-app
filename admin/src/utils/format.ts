/**
 * Форматтеры для UI. Все используют ru-RU локаль.
 */

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
});

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    return dateTimeFormatter.format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    return dateFormatter.format(new Date(iso));
}

export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return "—";
    return currencyFormatter.format(amount);
}

/**
 * Длительность между двумя ISO-датами в формате «1ч 23м».
 */
export function formatDuration(fromIso: string | null, toIso: string | null): string {
    if (!fromIso || !toIso) return "—";
    const minutes = Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000));
    if (minutes < 60) return `${minutes}м`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours}ч` : `${hours}ч ${rest}м`;
}

/**
 * «Сколько прошло с момента fromIso» относительно `nowMs` (timestamp в мс).
 *
 *   < 1 минуты   → «только что»
 *   < 1 часа     → «12 мин»
 *   < 24 часов   → «3ч 14м»
 *   ≥ 24 часов   → «2д 5ч»
 *
 * `nowMs` явный параметр — компонент держит общий `now` для всех строк
 * таблицы и тикает интервалом, чтобы счётчик жил без re-fetch.
 */
export function formatTimeSince(fromIso: string | null, nowMs: number): string {
    if (!fromIso) return "—";
    const from = new Date(fromIso).getTime();
    if (Number.isNaN(from)) return "—";
    const totalMinutes = Math.max(0, Math.floor((nowMs - from) / 60000));
    if (totalMinutes < 1) return "только что";
    if (totalMinutes < 60) return `${totalMinutes} мин`;
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
        const restMin = totalMinutes % 60;
        return restMin === 0 ? `${totalHours}ч` : `${totalHours}ч ${restMin}м`;
    }
    const days = Math.floor(totalHours / 24);
    const restHours = totalHours % 24;
    return restHours === 0 ? `${days}д` : `${days}д ${restHours}ч`;
}

"use client";

import { useEffect, useState } from "react";

/**
 * Возвращает значение с задержкой `delayMs`. Используется, чтобы не
 * стучать на backend на каждое нажатие клавиши в поле поиска.
 *
 * cleanup сбрасывает таймер при следующем изменении value/delay, так
 * что в очередь react-query попадает только последнее значение.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(id);
    }, [value, delayMs]);
    return debounced;
}

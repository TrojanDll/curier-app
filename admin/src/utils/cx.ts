import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely.
 *
 * Накладывает clsx (для условных классов) поверх tailwind-merge,
 * чтобы дубликаты вроде `px-2 px-4` корректно сливались в `px-4`.
 */
export function cx(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/utils/cx";

interface DropdownMenuProps {
    trigger: ReactNode;
    children: ReactNode;
    /** Выравнивание popup-а относительно триггера. */
    align?: "left" | "right";
    /** Доступный label для триггера (если он только иконка). */
    label?: string;
}

/**
 * Простое контекстное меню с outside-click и Escape-закрытием.
 * Используется в строках таблицы (Edit/Pause/Resume/Уволить и т.п.).
 */
export function DropdownMenu({ trigger, children, align = "right", label }: DropdownMenuProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex size-8 items-center justify-center rounded-md text-fg-quaternary transition-colors hover:bg-primary_hover hover:text-fg-primary"
            >
                {trigger}
            </button>
            {open ? (
                <div
                    role="menu"
                    className={cx(
                        "absolute z-20 mt-1 min-w-[180px] overflow-hidden rounded-md border border-secondary bg-primary py-1 shadow-lg",
                        align === "right" ? "right-0" : "left-0",
                    )}
                    onClick={() => setOpen(false)}
                >
                    {children}
                </div>
            ) : null}
        </div>
    );
}

interface MenuItemProps {
    onSelect: () => void;
    icon?: ReactNode;
    destructive?: boolean;
    disabled?: boolean;
    children: ReactNode;
}

export function DropdownItem({ onSelect, icon, destructive, disabled, children }: MenuItemProps) {
    return (
        <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={onSelect}
            className={cx(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                disabled
                    ? "cursor-not-allowed text-quaternary"
                    : destructive
                      ? "text-error-primary hover:bg-error-primary"
                      : "text-secondary hover:bg-primary_hover hover:text-primary",
            )}
        >
            {icon ? <span className="inline-flex size-4 shrink-0 items-center">{icon}</span> : null}
            <span className="flex-1">{children}</span>
        </button>
    );
}

export function DropdownDivider() {
    return <div role="separator" className="my-1 h-px bg-secondary" />;
}

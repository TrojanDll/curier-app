"use client";

import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "@/utils/cx";

interface DropdownMenuProps {
    trigger: ReactNode;
    children: ReactNode;
    /** Выравнивание popup-а относительно триггера. */
    align?: "left" | "right";
    /** Доступный label для триггера (если он только иконка). */
    label?: string;
}

interface MenuPosition {
    top: number;
    /** Только одно из `left` / `right` устанавливается. */
    left?: number;
    right?: number;
}

/**
 * Контекстное меню для строк таблицы (Edit / Pause / Resume / Уволить и т.п.).
 *
 * Меню рендерится через `createPortal` в `document.body` с позицией
 * `position: fixed`, рассчитанной из `getBoundingClientRect()` триггера.
 *
 * Зачем портал: trigger живёт внутри `<td>` → `<table>` → `<div
 * overflow-x-auto>` → `<div overflow-hidden rounded-lg border>`. Любой
 * абсолютно-позиционированный popup внутри этой иерархии режется обоими
 * `overflow`-ами, и его приходится скроллить. Портал в `body` поднимает меню
 * над всеми границами таблицы.
 *
 * Закрытие: outside-click, Esc, скролл или resize окна (любое движение скроет
 * меню — проще, чем переcчитывать позицию на каждом тике).
 */
export function DropdownMenu({
    trigger,
    children,
    align = "right",
    label,
}: DropdownMenuProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<MenuPosition | null>(null);

    // Считаем позицию ровно перед первой отрисовкой меню — иначе на первый кадр
    // popup появляется в (0,0). useLayoutEffect синхронен с DOM-апдейтом.
    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const top = rect.bottom + 4; // mt-1 ≈ 4px
        if (align === "right") {
            setPosition({ top, right: window.innerWidth - rect.right });
        } else {
            setPosition({ top, left: rect.left });
        }
    }, [open, align]);

    useEffect(() => {
        if (!open) return;
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        // Captured-phase scroll: nested scrollers (например, overflow-x-auto
        // у обёртки таблицы) не пузырят scroll-события до window, поэтому
        // обычный bubbling-listener их не услышит.
        const handleScroll = () => setOpen(false);
        const handleResize = () => setOpen(false);
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleResize);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleResize);
        };
    }, [open]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpen((v) => !v);
                }}
                className="inline-flex size-8 items-center justify-center rounded-md text-fg-quaternary transition-colors hover:bg-primary_hover hover:text-fg-primary"
            >
                {trigger}
            </button>
            {open && position && typeof document !== "undefined"
                ? createPortal(
                      <div
                          ref={menuRef}
                          role="menu"
                          style={{
                              position: "fixed",
                              top: position.top,
                              left: position.left,
                              right: position.right,
                              // z-60 — выше drawer-а (z-50) на случай открытого
                              // лайтбокса/боковой панели; равно lightbox-у —
                              // одновременно они не сосуществуют.
                              zIndex: 60,
                          }}
                          className={cx(
                              "min-w-[180px] overflow-hidden rounded-md border border-secondary bg-primary py-1 shadow-lg",
                          )}
                          onClick={() => setOpen(false)}
                      >
                          {children}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}

interface MenuItemProps {
    onSelect: () => void;
    icon?: ReactNode;
    destructive?: boolean;
    disabled?: boolean;
    children: ReactNode;
}

export function DropdownItem({
    onSelect,
    icon,
    destructive,
    disabled,
    children,
}: MenuItemProps) {
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart02,
    HomeLine,
    LogOut01,
    Package,
    Settings01,
    UploadCloud01,
    Users01,
} from "@untitledui/icons";
import { useLogout, useUser } from "@/lib/auth/use-auth";
import { cx } from "@/utils/cx";

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    /** Точное совпадение пути (для главной "/", чтобы не подсвечивалась везде). */
    exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { href: "/", label: "Главная", icon: HomeLine, exact: true },
    { href: "/orders", label: "Заказы", icon: Package },
    { href: "/couriers", label: "Курьеры", icon: Users01 },
    { href: "/statistics", label: "Статистика", icon: BarChart02 },
    { href: "/app-updates", label: "Обновления", icon: UploadCloud01 },
    { href: "/settings", label: "Настройки", icon: Settings01 },
];

function isActive(pathname: string, item: NavItem): boolean {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function Sidebar() {
    const pathname = usePathname();
    const logout = useLogout();
    const user = useUser();

    const handleLogout = () => {
        if (logout.isPending) return;
        logout.mutate();
    };

    return (
        <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col self-start border-r border-secondary bg-primary">
            {/* Логотип */}
            <div className="flex h-16 items-center px-6">
                <span className="text-lg font-semibold text-primary">Курьер</span>
                <span className="ml-2 text-sm text-tertiary">Админ-панель</span>
            </div>

            {/* Навигация */}
            <nav className="flex-1 px-3 py-2">
                <ul className="flex flex-col gap-0.5">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(pathname, item);
                        const Icon = item.icon;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cx(
                                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        active
                                            ? "bg-secondary text-primary"
                                            : "text-secondary hover:bg-primary_hover hover:text-primary",
                                    )}
                                >
                                    <Icon
                                        className={cx(
                                            "size-5 shrink-0",
                                            active ? "text-fg-brand-primary" : "text-fg-quaternary",
                                        )}
                                    />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User info + Logout снизу */}
            <div className="border-t border-secondary p-3">
                {user ? (
                    <div className="mb-2 px-3 py-1">
                        <p className="truncate text-sm font-medium text-primary">{user.fullName}</p>
                        <p className="truncate text-xs text-tertiary">{user.username}</p>
                    </div>
                ) : null}
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-primary_hover hover:text-primary disabled:opacity-60"
                >
                    <LogOut01 className="size-5 shrink-0 text-fg-quaternary" />
                    <span>{logout.isPending ? "Выходим…" : "Выйти"}</span>
                </button>
            </div>
        </aside>
    );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    BarChart02,
    HomeLine,
    LogOut01,
    Package,
    Settings01,
    Users01,
} from "@untitledui/icons";
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
    { href: "/settings", label: "Настройки", icon: Settings01 },
];

function isActive(pathname: string, item: NavItem): boolean {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        // На этапе моков cookie не HttpOnly — чистим через document.
        // На Этапе 3 заменим на POST /api/auth/logout.
        document.cookie = "admin-auth-token=; path=/; max-age=0";
        router.push("/login");
        router.refresh();
    };

    return (
        <aside className="flex h-screen w-[260px] flex-col border-r border-secondary bg-primary">
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

            {/* Logout снизу */}
            <div className="border-t border-secondary p-3">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-primary_hover hover:text-primary"
                >
                    <LogOut01 className="size-5 shrink-0 text-fg-quaternary" />
                    <span>Выйти</span>
                </button>
            </div>
        </aside>
    );
}

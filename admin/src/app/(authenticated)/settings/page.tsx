import { Header } from "@/components/application/Header";
import { SettingsClient } from "./SettingsClient";

export const metadata = {
    title: "Настройки — Курьер",
};

/**
 * TTL фото и смена пароля администратора.
 * §14.3.6 — реальные запросы `/api/admin/settings` (GET/PATCH) и
 * `/api/auth/admin/change-password`.
 */
export default function SettingsPage() {
    return (
        <>
            <Header title="Настройки" description="TTL фото и пароль администратора" />
            <SettingsClient />
        </>
    );
}

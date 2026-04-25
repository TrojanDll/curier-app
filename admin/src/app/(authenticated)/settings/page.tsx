import { Header } from "@/components/application/Header";
import { SettingsClient } from "./SettingsClient";

export const metadata = {
    title: "Настройки — Курьер",
};

/**
 * TTL фото и смена пароля администратора.
 * Реальные API-запросы (PATCH /api/admin/settings,
 * POST /api/admin/auth/change-password) подключим в §14.3.6.
 */
export default function SettingsPage() {
    return (
        <>
            <Header title="Настройки" description="TTL фото и пароль администратора" />
            <SettingsClient />
        </>
    );
}

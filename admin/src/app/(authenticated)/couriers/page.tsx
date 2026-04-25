import { Header } from "@/components/application/Header";
import { CouriersClient } from "./CouriersClient";

export const metadata = {
    title: "Курьеры — Курьер",
};

/**
 * CRUD-страница курьеров.
 * Действия (edit/pause/resume/reset-password/fire) на Этапе 1 работают
 * как локальные мутации стейта; реальные API подключим в §14.3.4.
 */
export default function CouriersPage() {
    return (
        <>
            <Header title="Курьеры" description="Управление штатом и статусами курьеров" />
            <CouriersClient />
        </>
    );
}

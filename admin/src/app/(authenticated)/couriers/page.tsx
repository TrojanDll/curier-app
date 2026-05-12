import { Header } from "@/components/application/Header";
import { CouriersClient } from "./CouriersClient";

export const metadata = {
    title: "Курьеры — Курьер",
};

/**
 * CRUD-страница курьеров. Подключена к backend в §14.3.4
 * (см. docs/admin-couriers.md). Дополняет actions из drawer-а:
 * Create / Edit / Pause / Resume / Reset password / Fire (soft delete).
 */
export default function CouriersPage() {
    return (
        <>
            <Header title="Курьеры" description="Управление штатом и статусами курьеров" />
            <CouriersClient />
        </>
    );
}

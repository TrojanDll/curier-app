import { Header } from "@/components/application/Header";
import { CreateOrderButton, OrdersClient } from "./OrdersClient";

export const metadata = {
    title: "Заказы — Курьер",
};

/**
 * Список заказов с фильтрами, поиском, пагинацией и drawer-ом деталей.
 * На Этапе 1 работает на моках; live-обновления по Socket.IO и реальные
 * API-запросы появятся в Этапе 3 (§14.3.3 / §14.3.7).
 */
export default function OrdersPage() {
    return (
        <>
            <Header
                title="Заказы"
                description="Live-таблица всех заказов предприятия"
                actions={<CreateOrderButton />}
            />
            <OrdersClient />
        </>
    );
}

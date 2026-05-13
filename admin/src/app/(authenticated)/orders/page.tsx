import { Header } from "@/components/application/Header";
import { OrdersClient } from "./OrdersClient";

export const metadata = {
    title: "Заказы — Курьер",
};

/**
 * Список заказов с фильтрами, поиском, пагинацией и drawer-ом деталей.
 * Кнопка «Создать заказ» живёт в toolbar внутри OrdersClient, т.к.
 * открытие drawer-а требует client-state (см. CouriersClient).
 */
export default function OrdersPage() {
    return (
        <>
            <Header
                title="Заказы"
                description="Live-таблица всех заказов предприятия"
            />
            <OrdersClient />
        </>
    );
}

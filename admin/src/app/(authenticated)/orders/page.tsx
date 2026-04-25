import { Header } from "@/components/application/Header";

/**
 * Список заказов с live-обновлениями.
 * Полная разметка (таблица, фильтры, drawer) — задача §14.1.4.
 */
export default function OrdersPage() {
    return (
        <>
            <Header
                title="Заказы"
                description="Live-таблица всех заказов предприятия"
            />
            <div className="px-8 py-6">
                <p className="text-md text-tertiary">Скелет таблицы появится в следующем шаге.</p>
            </div>
        </>
    );
}

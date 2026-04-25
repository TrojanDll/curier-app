import { Header } from "@/components/application/Header";

/**
 * Графики и срезы статистики.
 * Содержимое — задача §14.1.6.
 */
export default function StatisticsPage() {
    return (
        <>
            <Header
                title="Статистика"
                description="Графики по заказам, времени доставки и курьерам"
            />
            <div className="px-8 py-6">
                <p className="text-md text-tertiary">Графики Recharts появятся в следующем шаге.</p>
            </div>
        </>
    );
}

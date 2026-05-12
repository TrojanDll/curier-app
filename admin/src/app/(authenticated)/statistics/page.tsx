import { Header } from "@/components/application/Header";
import { StatisticsClient } from "./StatisticsClient";

export const metadata = {
    title: "Статистика — Курьер",
};

/**
 * Графики и срезы статистики (Recharts).
 * §14.3.5 — реальные данные из `/api/admin/statistics/overview` + `/couriers`.
 */
export default function StatisticsPage() {
    return (
        <>
            <Header
                title="Статистика"
                description="Графики по заказам, времени доставки и курьерам"
            />
            <StatisticsClient />
        </>
    );
}

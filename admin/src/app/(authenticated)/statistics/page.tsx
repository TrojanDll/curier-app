import { Header } from "@/components/application/Header";
import { StatisticsClient } from "./StatisticsClient";

export const metadata = {
    title: "Статистика — Курьер",
};

/**
 * Графики и срезы статистики (Recharts).
 * На Этапе 1 — синтетические данные; реальные эндпойнты подключим в §14.3.5.
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

import { Header } from "@/components/application/Header";

/**
 * Dashboard — главная страница админки.
 * Содержимое (карточки метрик) добавляется в задаче §14.1.8.
 */
export default function DashboardPage() {
    return (
        <>
            <Header title="Главная" description="Сводные метрики по работе предприятия" />
            <div className="px-8 py-6">
                <p className="text-md text-tertiary">Карточки с метриками появятся в следующем шаге.</p>
            </div>
        </>
    );
}

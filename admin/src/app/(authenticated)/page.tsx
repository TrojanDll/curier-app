import { DashboardClient } from "./DashboardClient";

export const metadata = {
    title: "Главная — Курьер",
};

/**
 * Dashboard — стартовая страница админки.
 *
 * Этот файл должен оставаться server-component, потому что Next.js разрешает
 * экспорт `metadata` только из server-modules. Вся live-логика c react-query
 * вынесена в client-component DashboardClient.
 */
export default function DashboardPage() {
    return <DashboardClient />;
}

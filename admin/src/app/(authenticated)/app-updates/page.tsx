import { Header } from "@/components/application/Header";
import { AppUpdatesClient } from "./AppUpdatesClient";

export const metadata = {
    title: "Обновления — Курьер",
};

export default function AppUpdatesPage() {
    return (
        <>
            <Header
                title="Обновления приложения"
                description="Версии Android-приложения и публикация новых сборок для курьеров"
            />
            <AppUpdatesClient />
        </>
    );
}

import { Header } from "@/components/application/Header";
import { SystemUpdateClient } from "./SystemUpdateClient";

export const metadata = {
    title: "Обновления сервера — Курьер",
};

/**
 * Self-update серверного стека: показывает текущую/доступную версию из
 * GitHub-релизов и применяет обновление по кнопке (sidecar `updater`).
 * См. docs/self-update.md.
 */
export default function SystemUpdatePage() {
    return (
        <>
            <Header
                title="Обновления сервера"
                description="Версия backend + admin и обновление из GitHub"
            />
            <SystemUpdateClient />
        </>
    );
}

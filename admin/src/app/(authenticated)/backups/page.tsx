import { Header } from "@/components/application/Header";
import { BackupsClient } from "./BackupsClient";

export const metadata = {
    title: "Бэкапы — Курьер",
};

/**
 * Резервное копирование данных: создание/скачивание бэкапов в ZIP, история,
 * восстановление, импорт и экспорт. См. docs/backups.md.
 */
export default function BackupsPage() {
    return (
        <>
            <Header title="Бэкапы" />
            <BackupsClient />
        </>
    );
}

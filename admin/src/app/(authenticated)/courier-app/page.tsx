import { Header } from "@/components/application/Header";
import { CourierAppClient } from "./CourierAppClient";

export const metadata = {
    title: "Приложение курьера — Курьер",
};

/**
 * Раздаточная вкладка для новых курьеров: адрес сервера для экрана
 * «Подключение к серверу», скачивание APK и готовая памятка для передачи.
 * См. docs/android-server-config.md, docs/app-update.md.
 */
export default function CourierAppPage() {
    return (
        <>
            <Header
                title="Приложение"
                description="Всё, что нужно передать новому курьеру: адрес сервера, приложение и памятка по установке."
            />
            <CourierAppClient />
        </>
    );
}

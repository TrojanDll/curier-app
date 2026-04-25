import { Header } from "@/components/application/Header";

/**
 * CRUD-страница курьеров.
 * Содержимое — задача §14.1.5.
 */
export default function CouriersPage() {
    return (
        <>
            <Header title="Курьеры" description="Управление штатом и статусами курьеров" />
            <div className="px-8 py-6">
                <p className="text-md text-tertiary">Скелет CRUD-таблицы появится в следующем шаге.</p>
            </div>
        </>
    );
}

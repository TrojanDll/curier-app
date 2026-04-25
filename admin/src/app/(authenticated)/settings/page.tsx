import { Header } from "@/components/application/Header";

/**
 * Системные настройки: TTL фото, смена пароля админа и т.п.
 * Содержимое — задача §14.1.7.
 */
export default function SettingsPage() {
    return (
        <>
            <Header title="Настройки" description="TTL фото и пароль администратора" />
            <div className="px-8 py-6">
                <p className="text-md text-tertiary">Форма настроек появится в следующем шаге.</p>
            </div>
        </>
    );
}

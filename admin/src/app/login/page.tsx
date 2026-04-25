/**
 * Страница входа.
 * UI и моковая логика — задача §14.1.3.
 */
export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
            <div className="w-full max-w-sm rounded-lg border border-secondary bg-primary p-6 shadow-sm">
                <h1 className="text-display-xs font-semibold text-primary">Курьер — Админ-панель</h1>
                <p className="mt-2 text-sm text-tertiary">
                    Полноценная форма входа появится в следующем шаге.
                </p>
            </div>
        </main>
    );
}

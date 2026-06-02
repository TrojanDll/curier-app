import { Suspense } from "react";
import { LoginForm } from "@/components/forms/LoginForm";

export const metadata = {
    title: "Вход — Администратор",
};

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex flex-col items-center gap-2 text-center">
                    <span className="text-display-xs font-semibold text-primary">Администратор</span>
                    <p className="text-sm text-tertiary">Вход в админ-панель</p>
                </div>
                <div className="rounded-xl border border-secondary bg-primary p-6 shadow-sm">
                    {/* useSearchParams требует Suspense-границу для prerender. */}
                    <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-secondary" />}>
                        <LoginForm />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";

const AUTH_COOKIE = "admin-auth-token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 дней

/**
 * Форма входа администратора.
 *
 * На Этапе 1 (моки) принимает любую непустую пару логин/пароль и просто
 * выставляет cookie. На Этапе 3 (§14.3.2) submit пойдёт через
 * POST /api/auth/admin/login и cookie выставит сервер.
 */
export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password) {
            setError("Заполните логин и пароль");
            return;
        }

        startTransition(async () => {
            // Имитация сетевой задержки.
            await new Promise((resolve) => setTimeout(resolve, 400));

            document.cookie = `${AUTH_COOKIE}=mock-token; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;

            const from = searchParams.get("from");
            const target = from && from.startsWith("/") && from !== "/login" ? from : "/";
            router.push(target);
            router.refresh();
        });
    };

    return (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <Input
                label="Логин"
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isPending}
                required
            />
            <Input
                label="Пароль"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isPending}
                required
            />
            {error ? (
                <p
                    role="alert"
                    className="rounded-md bg-error-primary px-3 py-2 text-sm text-error-primary"
                >
                    {error}
                </p>
            ) : null}
            <Button type="submit" size="lg" isLoading={isPending} className="w-full">
                Войти
            </Button>
            <p className="text-center text-sm text-tertiary">
                На этапе моков подходит любая непустая пара логин/пароль.
            </p>
        </form>
    );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { isApiError } from "@/lib/api";
import { useLogin } from "@/lib/auth/use-auth";

/**
 * Форма входа администратора. Submit идёт через `useLogin` mutation на
 * BFF `/api/auth/login`; HttpOnly cookies выставляются route handler-ом.
 */
export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const login = useLogin();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setValidationError(null);

        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password) {
            setValidationError("Заполните логин и пароль");
            return;
        }

        login.mutate(
            { username: trimmedUsername, password },
            {
                onSuccess: () => {
                    const from = searchParams.get("from");
                    const target = from && from.startsWith("/") && from !== "/login" ? from : "/";
                    router.replace(target);
                },
            },
        );
    };

    const serverError = login.error
        ? isApiError(login.error)
            ? login.error.status === 401
                ? "Неверный логин или пароль"
                : login.error.messages().join(". ")
            : "Не удалось выполнить вход"
        : null;
    const errorMessage = validationError ?? serverError;

    return (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <Input
                label="Логин"
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={login.isPending}
                required
            />
            <Input
                label="Пароль"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={login.isPending}
                required
            />
            {errorMessage ? (
                <p
                    role="alert"
                    className="rounded-md bg-error-primary px-3 py-2 text-sm text-error-primary"
                >
                    {errorMessage}
                </p>
            ) : null}
            <Button type="submit" size="lg" isLoading={login.isPending} className="w-full">
                Войти
            </Button>
        </form>
    );
}

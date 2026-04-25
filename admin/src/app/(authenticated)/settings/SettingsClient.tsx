"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";

interface Toast {
    id: number;
    text: string;
}

export function SettingsClient() {
    const [photoTtl, setPhotoTtl] = useState<string>("30");
    const [savingTtl, setSavingTtl] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (text: string) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, text }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    const handleSaveTtl = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const days = Number(photoTtl);
        if (!Number.isFinite(days) || days < 1 || days > 365) {
            showToast("TTL должен быть от 1 до 365 дней");
            return;
        }
        setSavingTtl(true);
        await new Promise((r) => setTimeout(r, 400));
        setSavingTtl(false);
        showToast(`TTL фото сохранён: ${days} дн.`);
    };

    const handleSavePassword = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordError(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("Заполните все поля");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("Новый пароль должен быть минимум 8 символов");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Пароли не совпадают");
            return;
        }

        setSavingPassword(true);
        await new Promise((r) => setTimeout(r, 500));
        setSavingPassword(false);

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showToast("Пароль обновлён (мок)");
    };

    return (
        <div className="flex flex-col gap-6 px-8 py-6">
            <SettingSection
                title="Текущий администратор"
                description="Эти данные синхронизируются с backend на Этапе 3."
            >
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Логин" value="admin" />
                    <Field label="Полное имя" value="Главный администратор" />
                    <Field label="Создан" value="01.11.2025" />
                    <Field label="Последний вход" value="25.04.2026 11:00" />
                </dl>
            </SettingSection>

            <SettingSection
                title="Хранение фото"
                description="Через сколько дней автоматически удалять загруженные фото доставок."
            >
                <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleSaveTtl}>
                    <div className="w-full sm:max-w-xs">
                        <Input
                            label="TTL фото (дней)"
                            type="number"
                            min={1}
                            max={365}
                            value={photoTtl}
                            onChange={(e) => setPhotoTtl(e.target.value)}
                            hint="По умолчанию 30 дней. От 1 до 365."
                        />
                    </div>
                    <Button type="submit" isLoading={savingTtl}>
                        Сохранить
                    </Button>
                </form>
            </SettingSection>

            <SettingSection
                title="Смена пароля"
                description="Минимум 8 символов. Поле текущего пароля валидируется backend-ом."
            >
                <form className="flex flex-col gap-4 sm:max-w-md" onSubmit={handleSavePassword}>
                    <Input
                        label="Текущий пароль"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Input
                        label="Новый пароль"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Input
                        label="Повтор нового пароля"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={passwordError ?? undefined}
                    />
                    <div>
                        <Button type="submit" isLoading={savingPassword}>
                            Обновить пароль
                        </Button>
                    </div>
                </form>
            </SettingSection>

            <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto rounded-md border border-secondary bg-primary px-4 py-2 text-sm text-primary shadow-lg"
                    >
                        {toast.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SettingSection({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-lg border border-secondary bg-primary p-6 shadow-xs">
            <header className="mb-4">
                <h2 className="text-lg font-semibold text-primary">{title}</h2>
                {description ? <p className="mt-1 text-sm text-tertiary">{description}</p> : null}
            </header>
            {children}
        </section>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wide text-tertiary">{label}</dt>
            <dd className="text-sm text-primary">{value}</dd>
        </div>
    );
}

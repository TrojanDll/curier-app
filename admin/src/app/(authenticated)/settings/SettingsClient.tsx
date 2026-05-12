"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import {
    isApiError,
    useChangeAdminPassword,
    useSettings,
    useUpdateSettings,
} from "@/lib/api";
import { useUser } from "@/lib/auth/use-auth";

interface Toast {
    id: number;
    text: string;
}

const PHOTO_TTL_MIN = 1;
const PHOTO_TTL_MAX = 365;
const PASSWORD_MIN = 8;
const SUPPORT_CONTACT_MAX = 500;

const UPDATED_AT_FMT = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

export function SettingsClient() {
    const user = useUser();

    const settingsQuery = useSettings();
    const updateSettings = useUpdateSettings();
    const changePassword = useChangeAdminPassword();

    const settings = settingsQuery.data;

    // Контролируемый input. Синхронизируется с свежими данными сервера
    // (включая onSuccess после PATCH), но не затирает локальные правки
    // пока пользователь печатает — поэтому держим в state, а не считаем из props.
    const [photoTtl, setPhotoTtl] = useState<string>("");
    const [supportContact, setSupportContact] = useState<string>("");
    useEffect(() => {
        if (settings) {
            setPhotoTtl(String(settings.photoTtlDays));
            setSupportContact(settings.supportContact ?? "");
        }
    }, [settings]);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);

    const showToast = (text: string) => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, text }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    const handleSaveTtl = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const days = Number(photoTtl);
        if (!Number.isInteger(days) || days < PHOTO_TTL_MIN || days > PHOTO_TTL_MAX) {
            showToast(`TTL должен быть целым числом от ${PHOTO_TTL_MIN} до ${PHOTO_TTL_MAX} дней`);
            return;
        }
        if (settings && days === settings.photoTtlDays) {
            showToast("TTL не изменился");
            return;
        }
        try {
            await updateSettings.mutateAsync({ photoTtlDays: days });
            showToast(`TTL фото сохранён: ${days} дн.`);
        } catch (error) {
            showToast(extractMessage(error, "Не удалось сохранить TTL"));
        }
    };

    const handleSaveSupport = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = supportContact.trim();
        if (trimmed.length > SUPPORT_CONTACT_MAX) {
            showToast(`Контакт не должен превышать ${SUPPORT_CONTACT_MAX} символов`);
            return;
        }
        // backend нормализует пустую строку → null, но мы отправляем null явно
        // чтобы локально не показывать "поле сохранено" при no-op.
        const nextValue = trimmed.length === 0 ? null : trimmed;
        const currentValue = settings?.supportContact ?? null;
        if (nextValue === currentValue) {
            showToast("Контакт не изменился");
            return;
        }
        try {
            await updateSettings.mutateAsync({ supportContact: nextValue });
            showToast(nextValue === null ? "Контакт поддержки очищен" : "Контакт поддержки сохранён");
        } catch (error) {
            showToast(extractMessage(error, "Не удалось сохранить контакт"));
        }
    };

    const handleSavePassword = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordError(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("Заполните все поля");
            return;
        }
        if (newPassword.length < PASSWORD_MIN) {
            setPasswordError(`Новый пароль должен быть минимум ${PASSWORD_MIN} символов`);
            return;
        }
        if (newPassword === currentPassword) {
            setPasswordError("Новый пароль должен отличаться от текущего");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Пароли не совпадают");
            return;
        }

        try {
            await changePassword.mutateAsync({ currentPassword, newPassword });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            showToast("Пароль обновлён. Другие сессии будут разлогинены автоматически.");
        } catch (error) {
            setPasswordError(extractMessage(error, "Не удалось сменить пароль"));
        }
    };

    return (
        <div className="flex flex-col gap-6 px-8 py-6">
            <SettingSection
                title="Текущий администратор"
                description="Имя и логин подставляются из активной сессии."
            >
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Логин" value={user?.username ?? "—"} />
                    <Field label="Полное имя" value={user?.fullName ?? "—"} />
                </dl>
            </SettingSection>

            <SettingSection
                title="Хранение фото"
                description="Через сколько дней автоматически удалять загруженные фото доставок. Применяется к новым загрузкам — у уже сохранённых фото срок не пересчитывается."
            >
                {settingsQuery.isError ? (
                    <p
                        role="alert"
                        className="mb-4 rounded-md bg-error-primary px-3 py-2 text-sm text-error-primary"
                    >
                        {extractMessage(settingsQuery.error, "Не удалось загрузить настройки")}
                    </p>
                ) : null}
                <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleSaveTtl}>
                    <div className="w-full sm:max-w-xs">
                        <Input
                            label="TTL фото (дней)"
                            type="number"
                            min={PHOTO_TTL_MIN}
                            max={PHOTO_TTL_MAX}
                            value={photoTtl}
                            onChange={(e) => setPhotoTtl(e.target.value)}
                            hint={`По умолчанию 30 дней. От ${PHOTO_TTL_MIN} до ${PHOTO_TTL_MAX}.`}
                            disabled={!settings && settingsQuery.isLoading}
                        />
                    </div>
                    <Button
                        type="submit"
                        isLoading={updateSettings.isPending}
                        disabled={!settings}
                    >
                        Сохранить
                    </Button>
                </form>
                {settings ? (
                    <p className="mt-3 text-xs text-tertiary">
                        Последнее обновление: {UPDATED_AT_FMT.format(new Date(settings.updatedAt))}
                    </p>
                ) : null}
            </SettingSection>

            <SettingSection
                title="Контакт поддержки"
                description="Курьер видит этот текст на экране Profile (§7.8). Свободная форма — имя диспетчера, телефон, Telegram, email. Пусто — курьеру показываем общий hint «обратитесь к администратору»."
            >
                <form className="flex flex-col gap-4 sm:max-w-xl" onSubmit={handleSaveSupport}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-secondary" htmlFor="support-contact">
                            Контакт
                        </label>
                        <textarea
                            id="support-contact"
                            rows={3}
                            maxLength={SUPPORT_CONTACT_MAX}
                            value={supportContact}
                            onChange={(e) => setSupportContact(e.target.value)}
                            placeholder="Например: Иван Петров, +7 999 123-45-67, @support_bot"
                            disabled={!settings && settingsQuery.isLoading}
                            className="w-full rounded-md border border-secondary bg-primary px-3 py-2 text-sm text-primary shadow-xs outline-none placeholder:text-placeholder focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/30 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <p className="text-xs text-tertiary">
                            Максимум {SUPPORT_CONTACT_MAX} символов. Пустое поле = «не настроено».
                        </p>
                    </div>
                    <div>
                        <Button
                            type="submit"
                            isLoading={updateSettings.isPending}
                            disabled={!settings}
                        >
                            Сохранить
                        </Button>
                    </div>
                </form>
            </SettingSection>

            <SettingSection
                title="Смена пароля"
                description={`Минимум ${PASSWORD_MIN} символов. Поле текущего пароля проверяется backend-ом.`}
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
                        <Button type="submit" isLoading={changePassword.isPending}>
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

function extractMessage(error: unknown, fallback: string): string {
    if (isApiError(error)) {
        const messages = error.messages();
        const first = messages[0];
        if (typeof first === "string" && first.length > 0) return first;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
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

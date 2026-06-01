"use client";

import { useState } from "react";
import { Button } from "@/components/base/Button";
import {
    isApiError,
    useCheckStackVersion,
    useStackUpdateStatus,
    useStackVersion,
    useTriggerStackUpdate,
    type UpdatePhase,
} from "@/lib/api";

const DT_FMT = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

export function SystemUpdateClient() {
    const versionQuery = useStackVersion();
    const checkVersion = useCheckStackVersion();
    const triggerUpdate = useTriggerStackUpdate();
    const [updating, setUpdating] = useState(false);
    const statusQuery = useStackUpdateStatus(updating);

    const info = versionQuery.data;

    const handleUpdate = async () => {
        const ok = window.confirm(
            "Обновить сервер до последней версии?\n\n" +
                "Backend и админ-панель будут пересобраны и перезапущены — сервис будет недоступен ~1–2 минуты, эта страница временно перестанет отвечать.\n\n" +
                "Рекомендуется заранее сделать резервную копию базы данных.",
        );
        if (!ok) return;
        try {
            await triggerUpdate.mutateAsync();
            setUpdating(true);
        } catch (error) {
            window.alert(extractMessage(error, "Не удалось запустить обновление"));
        }
    };

    return (
        <div className="flex flex-col gap-6 px-8 py-6">
            <Section title="Версия">
                {versionQuery.isError ? (
                    <Alert>{extractMessage(versionQuery.error, "Не удалось получить версию")}</Alert>
                ) : null}

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Текущая версия" value={info ? formatVersion(info.current) : "…"} />
                    <Field label="Доступная версия" value={info?.latest ?? "—"} />
                </dl>

                <div className="mt-4">
                    {info?.updateAvailable ? (
                        <span className="inline-flex items-center rounded-full border border-secondary bg-primary px-3 py-1 text-xs font-medium text-fg-brand-primary">
                            Доступно обновление{info.latest ? `: ${info.latest}` : ""}
                        </span>
                    ) : info ? (
                        <span className="inline-flex items-center rounded-full border border-secondary bg-primary px-3 py-1 text-xs font-medium text-tertiary">
                            Установлена актуальная версия
                        </span>
                    ) : null}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => checkVersion.mutate()}
                        isLoading={checkVersion.isPending}
                    >
                        Проверить обновления
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        isLoading={triggerUpdate.isPending}
                        disabled={!info?.updateAvailable || updating}
                    >
                        Обновить сервер
                    </Button>
                </div>
            </Section>

            {info?.latestNotes ? (
                <Section
                    title="Что нового"
                    description={
                        info.publishedAt
                            ? `Опубликовано: ${DT_FMT.format(new Date(info.publishedAt))}`
                            : undefined
                    }
                >
                    <pre className="whitespace-pre-wrap break-words text-sm text-secondary">
                        {info.latestNotes}
                    </pre>
                    {info.latestUrl ? (
                        <a
                            href={info.latestUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block text-sm text-fg-brand-primary underline"
                        >
                            Страница релиза на GitHub
                        </a>
                    ) : null}
                </Section>
            ) : null}

            {updating ? (
                <Section
                    title="Обновление запущено"
                    description="Сервис перезапускается. Эта страница может временно стать недоступной — подождите 1–2 минуты и обновите её (F5)."
                >
                    <p className="text-sm text-secondary">
                        Статус: <span className="font-medium text-primary">{statusLabel(statusQuery.data?.status)}</span>
                    </p>
                    {statusQuery.data?.log ? (
                        <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-secondary p-3 text-xs text-secondary">
                            {statusQuery.data.log}
                        </pre>
                    ) : null}
                </Section>
            ) : null}

            <Section title="Как это работает">
                <ul className="list-disc pl-5 text-sm text-tertiary">
                    <li>Обновления берутся из единого источника — публичного GitHub-репозитория проекта.</li>
                    <li>Применение по кнопке: сервер сам скачивает новые образы и перезапускает backend и админку.</li>
                    <li>Миграции базы данных применяются автоматически при старте backend.</li>
                    <li>Перед обновлением рекомендуется сделать резервную копию базы данных.</li>
                </ul>
            </Section>
        </div>
    );
}

function statusLabel(s?: UpdatePhase): string {
    switch (s) {
        case "in_progress":
            return "выполняется…";
        case "success":
            return "успешно";
        case "failed":
            return "ошибка";
        default:
            return "ожидание…";
    }
}

function formatVersion(v: string): string {
    return v === "dev" ? "dev (локальная сборка)" : v;
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

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children?: React.ReactNode;
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

function Alert({ children }: { children: React.ReactNode }) {
    return (
        <p
            role="alert"
            className="mb-4 rounded-md bg-error-primary px-3 py-2 text-sm text-error-primary"
        >
            {children}
        </p>
    );
}

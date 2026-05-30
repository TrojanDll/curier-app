"use client";

import { useRef, useState } from "react";
import {
    AlertTriangle,
    ClockRewind,
    Database01,
    Download01,
    InfoCircle,
    Plus,
    Trash01,
    UploadCloud01,
} from "@untitledui/icons";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import {
    backupDownloadUrl,
    isApiError,
    useBackups,
    useCreateBackup,
    useDeleteBackup,
    useImportBackup,
    useRestoreBackup,
    type BackupMeta,
    type BackupOrigin,
} from "@/lib/api";

const DT_FMT = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

interface Banner {
    kind: "success" | "error";
    text: string;
}

export function BackupsClient() {
    const backupsQuery = useBackups();
    const createBackup = useCreateBackup();
    const restoreBackup = useRestoreBackup();
    const deleteBackup = useDeleteBackup();
    const importBackup = useImportBackup();

    const [note, setNote] = useState("");
    const [banner, setBanner] = useState<Banner | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const items = backupsQuery.data ?? [];

    const handleCreate = async () => {
        setBanner(null);
        try {
            await createBackup.mutateAsync(note.trim() || null);
            setNote("");
            setBanner({ kind: "success", text: "Бэкап создан." });
        } catch (error) {
            setBanner({ kind: "error", text: extractMessage(error, "Не удалось создать бэкап") });
        }
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset early so selecting the same file again re-triggers onChange.
        e.target.value = "";
        if (!file) return;
        setBanner(null);
        try {
            await importBackup.mutateAsync(file);
            setBanner({ kind: "success", text: `Бэкап «${file.name}» импортирован.` });
        } catch (error) {
            setBanner({ kind: "error", text: extractMessage(error, "Не удалось импортировать бэкап") });
        }
    };

    const handleRestore = async (backup: BackupMeta) => {
        const when = DT_FMT.format(new Date(backup.contentCreatedAt));
        const ok = window.confirm(
            "ВОССТАНОВЛЕНИЕ ИЗ БЭКАПА\n\n" +
                `Текущие данные (заказы, курьеры, настройки, фото) будут ПОЛНОСТЬЮ заменены данными из бэкапа от ${when}.\n\n` +
                "• Перед заменой автоматически создаётся снимок текущего состояния — к нему можно вернуться.\n" +
                "• Все сессии будут сброшены; возможно, потребуется войти заново.\n" +
                "• Для входа после восстановления ваш администраторский аккаунт должен присутствовать в этом бэкапе.\n\n" +
                "Продолжить?",
        );
        if (!ok) return;
        setBanner(null);
        try {
            const result = await restoreBackup.mutateAsync(backup.id);
            setBanner({
                kind: "success",
                text:
                    "Восстановление завершено. Перед заменой создан авто-снимок " +
                    `(${result.safetySnapshotId}) — к нему можно вернуться. ` +
                    "Если вас выйдет из системы — войдите заново.",
            });
        } catch (error) {
            setBanner({ kind: "error", text: extractMessage(error, "Не удалось восстановить бэкап") });
        }
    };

    const handleDelete = async (backup: BackupMeta) => {
        const when = DT_FMT.format(new Date(backup.createdAt));
        const ok = window.confirm(`Удалить бэкап от ${when}? Файл будет удалён безвозвратно.`);
        if (!ok) return;
        setBanner(null);
        try {
            await deleteBackup.mutateAsync(backup.id);
            setBanner({ kind: "success", text: "Бэкап удалён." });
        } catch (error) {
            setBanner({ kind: "error", text: extractMessage(error, "Не удалось удалить бэкап") });
        }
    };

    const busy = restoreBackup.isPending || importBackup.isPending;

    return (
        <div className="flex flex-col gap-6 px-8 py-6">
            {banner ? (
                <p
                    role={banner.kind === "error" ? "alert" : "status"}
                    className={
                        banner.kind === "error"
                            ? "rounded-md bg-error-primary px-4 py-3 text-sm text-error-primary"
                            : "rounded-md bg-success-primary px-4 py-3 text-sm text-success-primary"
                    }
                >
                    {banner.text}
                </p>
            ) : null}

            <Section
                title="Создать бэкап"
                description="Сохраняет все данные (заказы, курьеры, настройки) и фотографии в один ZIP-архив."
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label htmlFor="backup-note" className="mb-1.5 block text-sm font-medium text-secondary">
                            Заметка (необязательно)
                        </label>
                        <Input
                            id="backup-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="например: перед обновлением"
                            maxLength={500}
                            disabled={createBackup.isPending}
                        />
                    </div>
                    <Button
                        leftIcon={<Plus className="size-4" />}
                        onClick={handleCreate}
                        isLoading={createBackup.isPending}
                        disabled={busy}
                    >
                        Создать бэкап
                    </Button>
                </div>

                <div className="mt-4 border-t border-secondary pt-4">
                    <p className="mb-2 text-sm text-tertiary">
                        Уже есть готовый ZIP-бэкап? Загрузите его в историю.
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip,application/zip"
                        className="hidden"
                        onChange={handleImportChange}
                    />
                    <Button
                        variant="secondary"
                        leftIcon={<UploadCloud01 className="size-4" />}
                        onClick={handleImportClick}
                        isLoading={importBackup.isPending}
                        disabled={busy || createBackup.isPending}
                    >
                        Импортировать из файла
                    </Button>
                </div>
            </Section>

            <Section title="История бэкапов">
                {backupsQuery.isError ? (
                    <Alert>{extractMessage(backupsQuery.error, "Не удалось загрузить историю")}</Alert>
                ) : null}

                <div className="overflow-hidden rounded-lg border border-secondary">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary">
                            <thead className="bg-secondary">
                                <tr className="text-left text-xs font-medium uppercase tracking-wide text-tertiary">
                                    <th className="px-4 py-3">Дата</th>
                                    <th className="px-4 py-3">Тип</th>
                                    <th className="px-4 py-3">Содержимое</th>
                                    <th className="px-4 py-3">Размер</th>
                                    <th className="px-4 py-3">Автор</th>
                                    <th className="px-4 py-3 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary text-sm">
                                {backupsQuery.isLoading && items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-tertiary">
                                            Загрузка…
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-tertiary">
                                            Бэкапов пока нет. Создайте первый.
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((backup) => {
                                        const restorePending =
                                            restoreBackup.isPending && restoreBackup.variables === backup.id;
                                        const deletePending =
                                            deleteBackup.isPending && deleteBackup.variables === backup.id;
                                        return (
                                            <tr key={backup.id}>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-primary tabular-nums">
                                                        {DT_FMT.format(new Date(backup.createdAt))}
                                                    </div>
                                                    {backup.note ? (
                                                        <div className="mt-0.5 max-w-[16rem] truncate text-xs text-tertiary">
                                                            {backup.note}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <OriginBadge origin={backup.origin} />
                                                </td>
                                                <td className="px-4 py-3 text-tertiary">
                                                    <span className="tabular-nums">{backup.counts.orders}</span> зак. ·{" "}
                                                    <span className="tabular-nums">{backup.counts.couriers}</span> кур. ·{" "}
                                                    <span className="tabular-nums">{backup.photoCount}</span> фото
                                                </td>
                                                <td className="px-4 py-3 text-tertiary tabular-nums">
                                                    {formatBytes(backup.sizeBytes)}
                                                </td>
                                                <td className="px-4 py-3 text-tertiary">{backup.createdBy ?? "—"}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <a
                                                            href={backupDownloadUrl(backup.id)}
                                                            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-secondary bg-primary px-3 text-sm font-semibold text-secondary transition-colors hover:bg-primary_hover"
                                                            title="Скачать / экспортировать ZIP"
                                                        >
                                                            <Download01 className="size-4" />
                                                            Скачать
                                                        </a>
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            leftIcon={<ClockRewind className="size-4" />}
                                                            onClick={() => handleRestore(backup)}
                                                            isLoading={restorePending}
                                                            disabled={busy || deletePending}
                                                        >
                                                            Восстановить
                                                        </Button>
                                                        <Button
                                                            variant="tertiary"
                                                            size="sm"
                                                            onClick={() => handleDelete(backup)}
                                                            isLoading={deletePending}
                                                            disabled={restorePending}
                                                            aria-label="Удалить бэкап"
                                                        >
                                                            <Trash01 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            <Section title="Как это работает">
                <ul className="flex flex-col gap-2 text-sm text-tertiary">
                    <li className="flex gap-2">
                        <Database01 className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
                        <span>
                            Бэкап — это единый ZIP-архив: все таблицы базы данных в формате JSON плюс файлы
                            фотографий заказов.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <Download01 className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
                        <span>
                            «Скачать» сохраняет архив на ваш компьютер — это же и есть экспорт. Архив можно
                            хранить отдельно и позже импортировать обратно.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <ClockRewind className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
                        <span>
                            «Восстановить» полностью заменяет текущие данные данными из бэкапа. Перед заменой
                            автоматически создаётся снимок текущего состояния, чтобы можно было откатиться назад.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-primary" />
                        <span>
                            Восстановление сбрасывает все сессии. Делайте его в спокойное время и убедитесь, что
                            ваш администраторский аккаунт есть в выбранном бэкапе.
                        </span>
                    </li>
                </ul>
            </Section>
        </div>
    );
}

function OriginBadge({ origin }: { origin: BackupOrigin }) {
    const map: Record<BackupOrigin, { label: string; className: string }> = {
        manual: {
            label: "Ручной",
            className: "border-secondary bg-primary text-secondary",
        },
        imported: {
            label: "Импорт",
            className: "border-brand bg-brand-primary text-fg-brand-primary",
        },
        "pre-restore": {
            label: "Авто-снимок",
            className: "border-warning bg-warning-primary text-warning-primary",
        },
    };
    const { label, className } = map[origin];
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
        >
            {label}
        </span>
    );
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

function Alert({ children }: { children: React.ReactNode }) {
    return (
        <p
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-md bg-error-primary px-3 py-2 text-sm text-error-primary"
        >
            <InfoCircle className="size-4 shrink-0" />
            {children}
        </p>
    );
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} КБ`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} МБ`;
    return `${(mb / 1024).toFixed(2)} ГБ`;
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

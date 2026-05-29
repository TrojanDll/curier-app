"use client";

import { useRef, useState, type FormEvent } from "react";
import { Trash01, UploadCloud01 } from "@untitledui/icons";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import {
    isApiError,
    useAppReleases,
    useDeleteAppRelease,
    useUploadAppRelease,
    type AppReleaseDto,
} from "@/lib/api";

interface Toast {
    id: number;
    text: string;
}

const RELEASE_NOTES_MAX = 4000;
const VERSION_NAME_MAX = 32;

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

export function AppUpdatesClient() {
    const releasesQuery = useAppReleases();
    const uploadRelease = useUploadAppRelease();
    const deleteRelease = useDeleteAppRelease();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [versionCode, setVersionCode] = useState("");
    const [versionName, setVersionName] = useState("");
    const [releaseNotes, setReleaseNotes] = useState("");
    const [isMandatory, setIsMandatory] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);

    const showToast = (text: string) => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, text }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };

    const resetForm = () => {
        setFile(null);
        setVersionCode("");
        setVersionName("");
        setReleaseNotes("");
        setIsMandatory(false);
        setFormError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        if (!file) {
            setFormError("Выберите APK-файл");
            return;
        }
        const code = Number(versionCode);
        if (!Number.isInteger(code) || code < 1) {
            setFormError("versionCode должен быть целым числом ≥ 1");
            return;
        }
        if (!versionName.trim()) {
            setFormError("Укажите versionName (например, 1.2.0)");
            return;
        }

        try {
            await uploadRelease.mutateAsync({
                file,
                versionCode: code,
                versionName: versionName.trim(),
                releaseNotes: releaseNotes.trim() || undefined,
                isMandatory,
            });
            showToast(`Версия ${versionName.trim()} (${code}) загружена`);
            resetForm();
        } catch (error) {
            setFormError(extractMessage(error, "Не удалось загрузить APK"));
        }
    };

    const handleDelete = async (release: AppReleaseDto) => {
        if (
            !window.confirm(
                `Удалить версию ${release.versionName} (${release.versionCode})? Файл APK будет удалён с сервера.`,
            )
        ) {
            return;
        }
        try {
            await deleteRelease.mutateAsync(release.id);
            showToast(`Версия ${release.versionName} удалена`);
        } catch (error) {
            showToast(extractMessage(error, "Не удалось удалить версию"));
        }
    };

    const releases = releasesQuery.data ?? [];

    return (
        <div className="flex flex-col gap-6 px-8 py-6">
            <Section
                title="Загрузить новую версию"
                description="Выберите подписанный release-APK и укажите версию. После загрузки курьеры получат предложение обновиться при следующем запуске приложения."
            >
                <form className="flex flex-col gap-4 sm:max-w-xl" onSubmit={handleUpload}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-secondary" htmlFor="apk-file">
                            APK-файл
                        </label>
                        <input
                            ref={fileInputRef}
                            id="apk-file"
                            type="file"
                            accept=".apk,application/vnd.android.package-archive"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-brand-solid file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-solid_hover"
                        />
                        {file ? (
                            <p className="text-xs text-tertiary">
                                {file.name} · {formatBytes(file.size)}
                            </p>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="w-full sm:max-w-[180px]">
                            <Input
                                label="versionCode"
                                type="number"
                                min={1}
                                step={1}
                                value={versionCode}
                                onChange={(e) => setVersionCode(e.target.value)}
                                hint="Целое, монотонно растёт"
                            />
                        </div>
                        <div className="w-full sm:max-w-[200px]">
                            <Input
                                label="versionName"
                                type="text"
                                maxLength={VERSION_NAME_MAX}
                                value={versionName}
                                onChange={(e) => setVersionName(e.target.value)}
                                placeholder="1.2.0"
                                hint="Человекочитаемая"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-secondary" htmlFor="release-notes">
                            Что нового (необязательно)
                        </label>
                        <textarea
                            id="release-notes"
                            rows={3}
                            maxLength={RELEASE_NOTES_MAX}
                            value={releaseNotes}
                            onChange={(e) => setReleaseNotes(e.target.value)}
                            placeholder="Список изменений, который увидит курьер в диалоге обновления"
                            className="w-full rounded-md border border-secondary bg-primary px-3 py-2 text-sm text-primary shadow-xs outline-none placeholder:text-placeholder focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/30 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-secondary">
                        <input
                            type="checkbox"
                            checked={isMandatory}
                            onChange={(e) => setIsMandatory(e.target.checked)}
                            className="size-4 rounded border-secondary text-brand-solid focus:ring-brand-secondary/30"
                        />
                        Обязательное обновление (курьер не сможет пропустить)
                    </label>

                    {formError ? (
                        <p role="alert" className="text-sm text-error-primary">
                            {formError}
                        </p>
                    ) : null}

                    <div>
                        <Button
                            type="submit"
                            isLoading={uploadRelease.isPending}
                            leftIcon={<UploadCloud01 className="size-4" />}
                        >
                            {uploadRelease.isPending ? "Загрузка…" : "Загрузить версию"}
                        </Button>
                    </div>
                </form>
            </Section>

            <Section
                title="Опубликованные версии"
                description="Курьерам предлагается версия с наибольшим versionCode."
            >
                {releasesQuery.isError ? (
                    <p
                        role="alert"
                        className="mb-4 rounded-md bg-error-primary px-3 py-2 text-sm text-error-primary"
                    >
                        {extractMessage(releasesQuery.error, "Не удалось загрузить список версий")}
                    </p>
                ) : null}

                {releasesQuery.isLoading && releases.length === 0 ? (
                    <p className="text-sm text-tertiary">Загрузка…</p>
                ) : releases.length === 0 ? (
                    <p className="text-sm text-tertiary">
                        Версий пока нет. Загрузите первый APK выше.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary">
                            <thead>
                                <tr className="text-left text-xs uppercase tracking-wide text-tertiary">
                                    <th className="px-3 py-2 font-medium">Версия</th>
                                    <th className="px-3 py-2 font-medium">Размер</th>
                                    <th className="px-3 py-2 font-medium">Загружена</th>
                                    <th className="px-3 py-2 font-medium">Что нового</th>
                                    <th className="px-3 py-2 font-medium" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary">
                                {releases.map((release, index) => (
                                    <tr key={release.id} className="align-top text-sm text-primary">
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{release.versionName}</span>
                                                <span className="text-xs text-tertiary">
                                                    ({release.versionCode})
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                {index === 0 ? <CurrentBadge /> : null}
                                                {release.isMandatory ? <MandatoryBadge /> : null}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-secondary">
                                            {formatBytes(release.fileSize)}
                                        </td>
                                        <td className="px-3 py-3 whitespace-nowrap text-secondary">
                                            {DATE_FMT.format(new Date(release.createdAt))}
                                        </td>
                                        <td className="px-3 py-3 text-secondary">
                                            <span className="line-clamp-3 whitespace-pre-line">
                                                {release.releaseNotes || "—"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                            <Button
                                                variant="tertiary"
                                                size="sm"
                                                leftIcon={<Trash01 className="size-4" />}
                                                onClick={() => handleDelete(release)}
                                                isLoading={
                                                    deleteRelease.isPending &&
                                                    deleteRelease.variables === release.id
                                                }
                                            >
                                                Удалить
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>

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

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function extractMessage(error: unknown, fallback: string): string {
    if (isApiError(error)) {
        const first = error.messages()[0];
        if (typeof first === "string" && first.length > 0) return first;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function CurrentBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-primary px-2 py-0.5 text-xs font-medium text-success-primary ring-1 ring-inset ring-success">
            Текущая
        </span>
    );
}

function MandatoryBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-primary px-2 py-0.5 text-xs font-medium text-warning-primary ring-1 ring-inset ring-warning">
            Обязательная
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

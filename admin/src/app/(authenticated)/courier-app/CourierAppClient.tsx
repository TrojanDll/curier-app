"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy01, Download01, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";

/**
 * Раздаточная страница для новых курьеров: всё, что нужно передать при выдаче
 * учётной записи, в одном месте — адрес сервера для экрана «Подключение к
 * серверу», ссылка на APK и готовая памятка для копирования в мессенджер.
 *
 * Адрес сервера админка нигде не хранит как «публичный» (BACKEND_API_URL —
 * это внутренний адрес BFF→backend, см. docs/docker-stack.md). Поэтому он
 * определяется из адреса самой панели в браузере: backend публично слушает на
 * том же хосте, порт BACKEND_PORT (по умолчанию 8081, см. docs/docker-stack.md).
 * Оператор может поправить значение вручную — оно запоминается в этом браузере.
 */

/** Порт, на котором backend публично доступен курьерам (host-порт стека). */
const DEFAULT_BACKEND_PORT = "8081";

/** Ключ в localStorage с ручной правкой адреса (на случай прокси/домена/порта). */
const SERVER_URL_STORAGE_KEY = "courier_server_url";

/** Событие синхронизации правки в пределах текущей вкладки (`storage` — только чужие). */
const SERVER_URL_EVENT = "courier-server-url-changed";

/**
 * Страница последнего релиза APK курьерского приложения на GitHub. GitHub сам
 * редиректит `/releases/latest` на самый свежий релиз с актуальным ассетом —
 * стабильной прямой ссылки нет, имя файла меняется от сборки к сборке
 * (см. docs/app-update.md).
 */
const COURIER_APK_RELEASE_URL = "https://github.com/TrojanDll/curier-app/releases/latest";

/** Адрес backend, выведенный из адреса открытой админ-панели. "" на сервере (SSR). */
function computeAutoServerUrl(): string {
    if (typeof window === "undefined") return "";
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
}

/** Ручная правка адреса из localStorage (или null, если её нет / SSR). */
function readServerUrlOverride(): string | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SERVER_URL_STORAGE_KEY);
    return raw && raw.trim() ? raw : null;
}

function subscribeServerUrl(callback: () => void): () => void {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener("storage", callback);
    window.addEventListener(SERVER_URL_EVENT, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(SERVER_URL_EVENT, callback);
    };
}

/** location не меняется в пределах страницы — подписка-заглушка. */
const NOOP_SUBSCRIBE = () => () => undefined;

function writeServerUrlOverride(value: string | null): void {
    if (typeof window === "undefined") return;
    if (value === null || !value.trim()) {
        window.localStorage.removeItem(SERVER_URL_STORAGE_KEY);
    } else {
        window.localStorage.setItem(SERVER_URL_STORAGE_KEY, value.trim());
    }
    window.dispatchEvent(new CustomEvent(SERVER_URL_EVENT));
}

/** Убирает пробелы и хвостовые слэши — в таком виде адрес вводят в приложении. */
function normalizeUrl(url: string): string {
    return url.trim().replace(/\/+$/, "");
}

/** Адрес, по которому курьеру с другого устройства не подключиться. */
function isLocalUrl(url: string): boolean {
    return /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);
}

export function CourierAppClient() {
    const override = useSyncExternalStore(subscribeServerUrl, readServerUrlOverride, () => null);
    const autoUrl = useSyncExternalStore(NOOP_SUBSCRIBE, computeAutoServerUrl, () => "");
    const displayUrl = override ?? autoUrl;
    const cleanUrl = normalizeUrl(displayUrl);
    const hasOverride = override !== null;

    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [copied, setCopied] = useState<"url" | "memo" | null>(null);

    const startEdit = () => {
        setDraft(displayUrl);
        setEditing(true);
    };

    const saveEdit = () => {
        // Совпало с автоопределённым — не держим лишнюю правку.
        const next = normalizeUrl(draft) === normalizeUrl(autoUrl) ? null : draft;
        writeServerUrlOverride(next);
        setEditing(false);
    };

    const handleReset = () => {
        writeServerUrlOverride(null);
        setEditing(false);
    };

    const copy = async (text: string, key: "url" | "memo") => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
        } catch {
            window.prompt("Скопируйте текст вручную:", text);
        }
    };

    const memo = buildMemo(cleanUrl);

    return (
        <div className="flex flex-col gap-6 px-8 py-6">
            <Section
                title="Адрес сервера"
                description="Этот адрес курьер вводит в приложении при первом запуске — на экране «Подключение к серверу»."
            >
                {editing ? (
                    <>
                        <Input
                            label="Адрес для подключения"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="http://адрес-сервера:8081"
                            spellCheck={false}
                            autoCapitalize="off"
                            autoFocus
                            className="font-mono"
                            hint="Адрес (IP или домен) и порт, по которым backend доступен курьерам из сети."
                        />
                        <div className="mt-3 flex gap-2">
                            <Button onClick={saveEdit} disabled={!normalizeUrl(draft)}>
                                Сохранить
                            </Button>
                            <Button variant="secondary" onClick={() => setEditing(false)}>
                                Отмена
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <code className="flex-1 truncate rounded-md border border-secondary bg-secondary px-3.5 py-2.5 font-mono text-sm text-primary">
                                {cleanUrl || "—"}
                            </code>
                            <Button
                                leftIcon={<Copy01 className="size-4" />}
                                onClick={() => copy(cleanUrl, "url")}
                                disabled={!cleanUrl}
                                className="shrink-0"
                            >
                                {copied === "url" ? "Скопировано" : "Копировать"}
                            </Button>
                        </div>

                        <p className="mt-2 text-xs text-tertiary">
                            {hasOverride
                                ? "Задан вручную."
                                : `Определён автоматически из адреса этой панели (порт ${DEFAULT_BACKEND_PORT}). Если backend доступен курьерам по другому адресу или порту — измените его.`}
                        </p>

                        {isLocalUrl(cleanUrl) ? (
                            <Alert>
                                Это локальный адрес — курьеру с телефона по нему не подключиться.
                                Укажите адрес (IP или домен), по которому backend доступен из сети
                                курьеров.
                            </Alert>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={startEdit}>
                                Изменить
                            </Button>
                            {hasOverride ? (
                                <Button
                                    variant="tertiary"
                                    leftIcon={<RefreshCw01 className="size-4" />}
                                    onClick={handleReset}
                                >
                                    Вернуть автоопределённый
                                </Button>
                            ) : null}
                        </div>
                    </>
                )}
            </Section>

            <Section
                title="Приложение курьера (APK)"
                description="Актуальная сборка Android-приложения. Скачайте файл и передайте курьеру для установки."
            >
                <a
                    href={COURIER_APK_RELEASE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-bg-brand-solid px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-bg-brand-solid_hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                    <Download01 className="size-4" />
                    Скачать APK для курьеров
                </a>
                <p className="mt-3 text-xs text-tertiary">
                    Откроется страница последнего релиза на GitHub — скачайте файл{" "}
                    <code>curier-&lt;номер&gt;.apk</code> из раздела Assets.
                </p>
            </Section>

            <Section
                title="Памятка для курьера"
                description="Готовый текст для передачи в мессенджере: ссылка на приложение, адрес сервера и шаги установки."
            >
                <ol className="flex flex-col gap-2 text-sm text-secondary">
                    <li>
                        <span className="font-medium text-primary">1.</span> Скачайте и установите
                        приложение из APK (при запросе разрешите установку из неизвестных источников).
                    </li>
                    <li>
                        <span className="font-medium text-primary">2.</span> Откройте приложение
                        «Курьер».
                    </li>
                    <li>
                        <span className="font-medium text-primary">3.</span> На экране «Подключение к
                        серверу» введите адрес:{" "}
                        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-primary">
                            {cleanUrl || "—"}
                        </code>
                    </li>
                    <li>
                        <span className="font-medium text-primary">4.</span> Войдите по логину и
                        паролю, которые выдал администратор.
                    </li>
                </ol>

                <div className="mt-4">
                    <Button
                        variant="secondary"
                        leftIcon={<Copy01 className="size-4" />}
                        onClick={() => copy(memo, "memo")}
                        disabled={!cleanUrl}
                    >
                        {copied === "memo" ? "Памятка скопирована" : "Скопировать памятку"}
                    </Button>
                </div>
            </Section>

            <Section title="Логин и пароль">
                <p className="text-sm text-tertiary">
                    Учётную запись курьера создайте на вкладке{" "}
                    <a href="/couriers" className="text-fg-brand-primary underline">
                        «Курьеры»
                    </a>{" "}
                    — там же задаётся пароль, который вводится вместе с адресом сервера.
                </p>
            </Section>
        </div>
    );
}

/** Текст памятки с подставленным адресом сервера и ссылкой на APK. */
function buildMemo(serverUrl: string): string {
    return [
        "Установка приложения «Курьер»",
        "",
        "1. Скачайте приложение по ссылке:",
        `   ${COURIER_APK_RELEASE_URL}`,
        "   (в разделе Assets — файл curier-<номер>.apk)",
        "",
        "2. Установите APK. При запросе разрешите установку из неизвестных источников.",
        "",
        "3. Откройте приложение «Курьер». На экране «Подключение к серверу» введите адрес:",
        `   ${serverUrl}`,
        "",
        "4. Войдите по логину и паролю, которые выдал администратор.",
    ].join("\n");
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
            className="mt-4 rounded-md border border-warning bg-warning-primary px-3 py-2 text-sm text-warning-primary"
        >
            {children}
        </p>
    );
}

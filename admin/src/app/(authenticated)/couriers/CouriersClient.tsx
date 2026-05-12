"use client";

import {
    DotsHorizontal,
    Edit01,
    Key01,
    PauseCircle,
    PlayCircle,
    Plus,
    SearchLg,
    UserX01,
    X,
} from "@untitledui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/base/Button";
import { DropdownDivider, DropdownItem, DropdownMenu } from "@/components/base/DropdownMenu";
import { Input } from "@/components/base/Input";
import { CourierStatusBadge } from "@/components/data-display/StatusBadge";
import { useDebounce } from "@/hooks/use-debounce";
import {
    isApiError,
    useCouriers,
    useCreateCourier,
    useFireCourier,
    usePauseCourier,
    useResetCourierPassword,
    useResumeCourier,
    useUpdateCourier,
    type CouriersListQuery,
    type CouriersStatusFilter,
    type CreateCourierInput,
    type UpdateCourierInput,
} from "@/lib/api";
import type { Courier, CourierDisplayStatus } from "@/types/courier";
import { cx } from "@/utils/cx";

type StatusFilter = CouriersStatusFilter;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Все" },
    { value: "active", label: "На базе" },
    { value: "paused", label: "На паузе" },
    { value: "disabled", label: "Уволенные" },
];

const PAGE_SIZE = 10;

type ToastKind = "info" | "success" | "error";

interface Toast {
    id: number;
    kind: ToastKind;
    text: string;
}

/**
 * Локальный аналог `computeCourierStatus` без зависимости от orders[].
 * Per docs/couriers.md, "busy" статус потребует StatisticsModule
 * (§14.3.5); до этого "available" покрывает обе live-состояния.
 */
function deriveStatus(courier: Courier): CourierDisplayStatus {
    if (!courier.isActive) return "fired";
    if (courier.isPaused) return "paused";
    return "available";
}

type DrawerState =
    | null
    | { mode: "create" }
    | { mode: "edit"; courier: Courier }
    | { mode: "reset-password"; courier: Courier };

function buildQuery(
    status: StatusFilter,
    debouncedSearch: string,
    page: number,
): CouriersListQuery {
    const q: CouriersListQuery = {
        page,
        pageSize: PAGE_SIZE,
        sortBy: "fullName",
        order: "asc",
    };
    if (status !== "all") q.status = status;
    const trimmed = debouncedSearch.trim();
    if (trimmed) q.search = trimmed;
    return q;
}

export function CouriersClient() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 300);
    const [page, setPage] = useState(1);
    const [drawer, setDrawer] = useState<DrawerState>(null);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);
    const pushToast = (text: string, kind: ToastKind = "success") => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, text, kind }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    // Дебаунс и переключение фильтров сбрасывают на первую страницу.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    const query = useMemo(
        () => buildQuery(statusFilter, debouncedSearch, page),
        [statusFilter, debouncedSearch, page],
    );
    const couriersQuery = useCouriers(query);
    const items = couriersQuery.data?.items ?? [];
    const total = couriersQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    useEffect(() => {
        if (!couriersQuery.data) return;
        if (page > totalPages) setPage(totalPages);
    }, [couriersQuery.data, page, totalPages]);

    const errorMessage = couriersQuery.error
        ? isApiError(couriersQuery.error)
            ? couriersQuery.error.messages().join(". ")
            : "Не удалось загрузить курьеров"
        : null;

    // Мутации для action-меню в строках.
    const pauseMutation = usePauseCourier();
    const resumeMutation = useResumeCourier();
    const fireMutation = useFireCourier();

    const handleTogglePause = (courier: Courier) => {
        const mutation = courier.isPaused ? resumeMutation : pauseMutation;
        mutation.mutate(courier.id, {
            onSuccess: (updated) => {
                pushToast(
                    updated.isPaused
                        ? `${updated.fullName} поставлен на паузу`
                        : `${updated.fullName} снят с паузы`,
                );
            },
            onError: (err) => {
                const text = isApiError(err) ? err.messages().join(". ") : "Не удалось обновить статус";
                pushToast(text, "error");
            },
        });
    };

    const handleFire = (courier: Courier) => {
        if (!confirm(`Уволить курьера ${courier.fullName}?`)) return;
        fireMutation.mutate(courier.id, {
            onSuccess: (updated) => {
                pushToast(`${updated.fullName} уволен`);
            },
            onError: (err) => {
                const text = isApiError(err) ? err.messages().join(". ") : "Не удалось уволить курьера";
                pushToast(text, "error");
            },
        });
    };

    return (
        <div className="flex flex-col gap-4 px-8 py-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => setStatusFilter(f.value)}
                            className={cx(
                                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                                statusFilter === f.value
                                    ? "bg-bg-brand-solid text-white"
                                    : "bg-primary text-secondary ring-1 ring-secondary hover:bg-primary_hover",
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-72">
                        <Input
                            type="search"
                            placeholder="Поиск по ФИО, логину, email…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            leftIcon={<SearchLg className="size-4" />}
                        />
                    </div>
                    <Button
                        leftIcon={<Plus className="size-4" />}
                        onClick={() => setDrawer({ mode: "create" })}
                    >
                        Добавить курьера
                    </Button>
                </div>
            </div>

            {errorMessage ? (
                <div className="rounded-md border border-error_subtle bg-error_primary px-4 py-3 text-sm text-error-primary">
                    {errorMessage}
                </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-secondary bg-primary shadow-xs">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary">
                        <thead className="bg-secondary">
                            <tr className="text-left text-xs font-medium uppercase tracking-wide text-tertiary">
                                <th className="px-4 py-3">ФИО</th>
                                <th className="px-4 py-3">Логин</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Телефон</th>
                                <th className="px-4 py-3">Статус</th>
                                <th className="px-4 py-3 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary text-sm">
                            {couriersQuery.isLoading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-tertiary">
                                        Загрузка…
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-tertiary">
                                        По заданным фильтрам курьеров нет.
                                    </td>
                                </tr>
                            ) : (
                                items.map((courier) => {
                                    const status = deriveStatus(courier);
                                    const togglePending =
                                        (pauseMutation.isPending && pauseMutation.variables === courier.id) ||
                                        (resumeMutation.isPending && resumeMutation.variables === courier.id);
                                    const firePending =
                                        fireMutation.isPending && fireMutation.variables === courier.id;
                                    return (
                                        <tr key={courier.id}>
                                            <td className="px-4 py-3 font-medium text-primary">
                                                {courier.fullName}
                                            </td>
                                            <td className="px-4 py-3 text-tertiary">{courier.username}</td>
                                            <td className="px-4 py-3 text-tertiary">{courier.email ?? "—"}</td>
                                            <td className="px-4 py-3 text-tertiary">{courier.phone ?? "—"}</td>
                                            <td className="px-4 py-3">
                                                <CourierStatusBadge status={status} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <DropdownMenu
                                                    label={`Действия для ${courier.fullName}`}
                                                    trigger={<DotsHorizontal className="size-5" />}
                                                >
                                                    <DropdownItem
                                                        icon={<Edit01 className="size-4" />}
                                                        onSelect={() => setDrawer({ mode: "edit", courier })}
                                                        disabled={!courier.isActive}
                                                    >
                                                        Редактировать
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        icon={
                                                            courier.isPaused ? (
                                                                <PlayCircle className="size-4" />
                                                            ) : (
                                                                <PauseCircle className="size-4" />
                                                            )
                                                        }
                                                        onSelect={() => handleTogglePause(courier)}
                                                        disabled={!courier.isActive || togglePending}
                                                    >
                                                        {courier.isPaused ? "Снять паузу" : "Поставить на паузу"}
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        icon={<Key01 className="size-4" />}
                                                        onSelect={() =>
                                                            setDrawer({ mode: "reset-password", courier })
                                                        }
                                                        disabled={!courier.isActive}
                                                    >
                                                        Сбросить пароль
                                                    </DropdownItem>
                                                    <DropdownDivider />
                                                    <DropdownItem
                                                        icon={<UserX01 className="size-4" />}
                                                        onSelect={() => handleFire(courier)}
                                                        destructive
                                                        disabled={!courier.isActive || firePending}
                                                    >
                                                        Уволить
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {total > PAGE_SIZE ? (
                    <div className="flex items-center justify-between border-t border-secondary px-4 py-3 text-sm text-tertiary">
                        <span>
                            Показано {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} из {total}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={page <= 1 || couriersQuery.isFetching}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Назад
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={page >= totalPages || couriersQuery.isFetching}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            >
                                Вперёд
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Drawer (create / edit / reset-password) */}
            <CourierDrawer
                state={drawer}
                onClose={() => setDrawer(null)}
                onCreated={(courier) => {
                    pushToast(`Курьер ${courier.fullName} создан`);
                    setDrawer(null);
                }}
                onUpdated={(courier) => {
                    pushToast(`${courier.fullName} обновлён`);
                    setDrawer(null);
                }}
                onPasswordReset={(courier) => {
                    pushToast(`Пароль ${courier.fullName} сброшен`);
                    setDrawer(null);
                }}
            />

            {/* Toasts */}
            <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={cx(
                            "pointer-events-auto rounded-md border px-4 py-2 text-sm shadow-lg",
                            toast.kind === "error"
                                ? "border-error_subtle bg-error_primary text-error-primary"
                                : "border-secondary bg-primary text-primary",
                        )}
                    >
                        {toast.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface CourierDrawerProps {
    state: DrawerState;
    onClose: () => void;
    onCreated: (c: Courier) => void;
    onUpdated: (c: Courier) => void;
    onPasswordReset: (c: Courier) => void;
}

function CourierDrawer({
    state,
    onClose,
    onCreated,
    onUpdated,
    onPasswordReset,
}: CourierDrawerProps) {
    useEffect(() => {
        if (!state) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [state, onClose]);

    if (!state) return null;

    const title =
        state.mode === "create"
            ? "Новый курьер"
            : state.mode === "edit"
              ? `Редактирование: ${state.courier.fullName}`
              : `Сброс пароля: ${state.courier.fullName}`;

    return (
        <div
            className="fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-labelledby="courier-drawer-title"
        >
            <div className="flex-1 bg-overlay/40" onClick={onClose} aria-hidden />
            <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-primary shadow-xl">
                <div className="flex items-start justify-between border-b border-secondary px-6 py-5">
                    <h2 id="courier-drawer-title" className="text-lg font-semibold text-primary">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-fg-quaternary transition-colors hover:bg-primary_hover hover:text-fg-primary"
                        aria-label="Закрыть"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                {state.mode === "create" ? (
                    <CreateForm onCancel={onClose} onCreated={onCreated} />
                ) : state.mode === "edit" ? (
                    <EditForm
                        key={state.courier.id}
                        courier={state.courier}
                        onCancel={onClose}
                        onUpdated={onUpdated}
                    />
                ) : (
                    <ResetPasswordForm
                        key={state.courier.id}
                        courier={state.courier}
                        onCancel={onClose}
                        onDone={onPasswordReset}
                    />
                )}
            </aside>
        </div>
    );
}

function CreateForm({
    onCancel,
    onCreated,
}: {
    onCancel: () => void;
    onCreated: (c: Courier) => void;
}) {
    const create = useCreateCourier();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");

    const errorMessage =
        create.error && isApiError(create.error) ? create.error.messages().join(". ") : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const input: CreateCourierInput = {
            username: username.trim(),
            password,
            fullName: fullName.trim(),
        };
        if (email.trim()) input.email = email.trim();
        if (phone.trim()) input.phone = phone.trim();
        if (dateOfBirth) input.dateOfBirth = dateOfBirth;
        create.mutate(input, { onSuccess: onCreated });
    };

    const canSubmit =
        !create.isPending && username.trim().length >= 3 && password.length >= 6 && fullName.trim();

    return (
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 px-6 py-5">
                <Input
                    label="Логин"
                    required
                    minLength={3}
                    maxLength={64}
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                    label="Пароль"
                    type="password"
                    required
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    hint="Минимум 6 символов"
                />
                <Input
                    label="ФИО"
                    required
                    maxLength={128}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                    label="Email"
                    type="email"
                    maxLength={128}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                    label="Телефон"
                    type="tel"
                    maxLength={32}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                    label="Дата рождения"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                />
                {errorMessage ? <p className="text-sm text-error-primary">{errorMessage}</p> : null}
            </div>
            <div className="mt-auto flex justify-end gap-2 border-t border-secondary px-6 py-4">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={create.isPending}>
                    Отмена
                </Button>
                <Button type="submit" disabled={!canSubmit} isLoading={create.isPending}>
                    Создать
                </Button>
            </div>
        </form>
    );
}

/**
 * Edit-форма заполняется текущими значениями курьера. Поля, оставшиеся
 * пустыми, отправляются как `null` (clear) только если они были непустыми
 * изначально; иначе — opt-out из PATCH-а (undefined). Так редактирование
 * одного поля не трогает остальные.
 */
function EditForm({
    courier,
    onCancel,
    onUpdated,
}: {
    courier: Courier;
    onCancel: () => void;
    onUpdated: (c: Courier) => void;
}) {
    const update = useUpdateCourier();
    const [username, setUsername] = useState(courier.username);
    const [fullName, setFullName] = useState(courier.fullName);
    const [email, setEmail] = useState(courier.email ?? "");
    const [phone, setPhone] = useState(courier.phone ?? "");
    const [dateOfBirth, setDateOfBirth] = useState(courier.dateOfBirth ?? "");

    const errorMessage =
        update.error && isApiError(update.error) ? update.error.messages().join(". ") : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const input: UpdateCourierInput = {};
        const trimmedUsername = username.trim();
        const trimmedFullName = fullName.trim();
        const trimmedEmail = email.trim();
        const trimmedPhone = phone.trim();
        if (trimmedUsername !== courier.username) input.username = trimmedUsername;
        if (trimmedFullName !== courier.fullName) input.fullName = trimmedFullName;
        if (trimmedEmail !== (courier.email ?? "")) {
            input.email = trimmedEmail === "" ? null : trimmedEmail;
        }
        if (trimmedPhone !== (courier.phone ?? "")) {
            input.phone = trimmedPhone === "" ? null : trimmedPhone;
        }
        if (dateOfBirth !== (courier.dateOfBirth ?? "")) {
            input.dateOfBirth = dateOfBirth === "" ? null : dateOfBirth;
        }
        // Если ничего не изменилось — закрываем без запроса.
        if (Object.keys(input).length === 0) {
            onCancel();
            return;
        }
        update.mutate({ id: courier.id, input }, { onSuccess: onUpdated });
    };

    const canSubmit = !update.isPending && username.trim().length >= 3 && fullName.trim();

    return (
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 px-6 py-5">
                <Input
                    label="Логин"
                    required
                    minLength={3}
                    maxLength={64}
                    autoComplete="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                    label="ФИО"
                    required
                    maxLength={128}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                    label="Email"
                    type="email"
                    maxLength={128}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    hint="Пусто — очистит поле"
                />
                <Input
                    label="Телефон"
                    type="tel"
                    maxLength={32}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    hint="Пусто — очистит поле"
                />
                <Input
                    label="Дата рождения"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                />
                {errorMessage ? <p className="text-sm text-error-primary">{errorMessage}</p> : null}
            </div>
            <div className="mt-auto flex justify-end gap-2 border-t border-secondary px-6 py-4">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={update.isPending}>
                    Отмена
                </Button>
                <Button type="submit" disabled={!canSubmit} isLoading={update.isPending}>
                    Сохранить
                </Button>
            </div>
        </form>
    );
}

function ResetPasswordForm({
    courier,
    onCancel,
    onDone,
}: {
    courier: Courier;
    onCancel: () => void;
    onDone: (c: Courier) => void;
}) {
    const reset = useResetCourierPassword();
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const mismatch = confirm.length > 0 && confirm !== newPassword;
    const tooShort = newPassword.length > 0 && newPassword.length < 6;
    const errorMessage =
        reset.error && isApiError(reset.error) ? reset.error.messages().join(". ") : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mismatch || tooShort || newPassword.length === 0) return;
        reset.mutate(
            { id: courier.id, newPassword },
            { onSuccess: () => onDone(courier) },
        );
    };

    const canSubmit =
        !reset.isPending && newPassword.length >= 6 && newPassword === confirm;

    return (
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 px-6 py-5">
                <p className="text-sm text-tertiary">
                    Активные сессии курьера будут аннулированы — ему придётся войти заново.
                </p>
                <Input
                    label="Новый пароль"
                    type="password"
                    required
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    error={tooShort ? "Минимум 6 символов" : undefined}
                />
                <Input
                    label="Подтверждение"
                    type="password"
                    required
                    minLength={6}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    error={mismatch ? "Пароли не совпадают" : undefined}
                />
                {errorMessage ? <p className="text-sm text-error-primary">{errorMessage}</p> : null}
            </div>
            <div className="mt-auto flex justify-end gap-2 border-t border-secondary px-6 py-4">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={reset.isPending}>
                    Отмена
                </Button>
                <Button type="submit" disabled={!canSubmit} isLoading={reset.isPending}>
                    Сбросить
                </Button>
            </div>
        </form>
    );
}

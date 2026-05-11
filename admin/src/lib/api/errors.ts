import axios, { type AxiosError } from "axios";

/**
 * Конверт ошибки от NestJS backend (см. docs/exceptions.md).
 *
 * `message` бывает строкой (HttpException) или массивом (ValidationPipe
 * с `forbidNonWhitelisted` — несколько constraint violations).
 */
export interface ApiErrorEnvelope {
    statusCode: number;
    message: string | string[];
    error: string;
    requestId?: string;
    timestamp?: string;
    path?: string;
}

export class ApiError extends Error {
    override readonly name = "ApiError";
    /** HTTP status. `0` означает сетевую ошибку (CORS / offline / abort). */
    readonly status: number;
    /** Текстовый код от Nest (`Bad Request`, `Unauthorized` …). */
    readonly code: string;
    /** `x-request-id` от backend — пишем в логи, если упало. */
    readonly requestId: string | null;
    readonly envelope: ApiErrorEnvelope | null;

    constructor(
        message: string,
        status: number,
        code: string,
        envelope: ApiErrorEnvelope | null,
        requestId: string | null,
    ) {
        super(message);
        this.status = status;
        this.code = code;
        this.envelope = envelope;
        this.requestId = requestId;
    }

    /** Список user-friendly строк (всегда массив; удобно для отображения). */
    messages(): string[] {
        const m = this.envelope?.message;
        if (m === undefined) return [this.message];
        return Array.isArray(m) ? m : [m];
    }
}

export function isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
}

export function toApiError(err: unknown): ApiError {
    if (err instanceof ApiError) return err;

    if (axios.isAxiosError(err)) {
        const ax = err as AxiosError<ApiErrorEnvelope>;
        const status = ax.response?.status ?? 0;
        const envelope = (ax.response?.data ?? null) as ApiErrorEnvelope | null;

        const headerRid = ax.response?.headers?.["x-request-id"];
        const requestId =
            (typeof headerRid === "string" ? headerRid : null) ??
            envelope?.requestId ??
            null;

        if (envelope && typeof envelope === "object" && "message" in envelope) {
            const m = envelope.message;
            const summary = Array.isArray(m) ? m.join("; ") : m ?? ax.message;
            const code = envelope.error ?? statusText(status);
            return new ApiError(summary, status, code, envelope, requestId);
        }

        return new ApiError(
            ax.message || "Network error",
            status,
            status === 0 ? "Network Error" : statusText(status),
            null,
            requestId,
        );
    }

    if (err instanceof Error) {
        return new ApiError(err.message, 0, "Unknown", null, null);
    }
    return new ApiError("Unknown error", 0, "Unknown", null, null);
}

function statusText(status: number): string {
    if (status >= 500) return "Server Error";
    if (status >= 400) return "Client Error";
    return "Unknown";
}

const DEFAULT_BACKEND_URL = "http://localhost:8081";

/**
 * Origin of the NestJS backend. Server-only — `BACKEND_API_URL` is NOT
 * prefixed `NEXT_PUBLIC_`, so it never reaches the browser bundle.
 *
 * The browser always talks to the BFF on the same Next.js origin and the
 * BFF forwards to this URL.
 */
export function getBackendBaseUrl(): string {
    const fromEnv = process.env.BACKEND_API_URL?.replace(/\/+$/, "");
    return `${fromEnv || DEFAULT_BACKEND_URL}/api`;
}

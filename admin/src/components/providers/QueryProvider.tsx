"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { createQueryClient } from "@/lib/api";

/**
 * QueryClient привязан к жизненному циклу компонента через `useState(lazy)`,
 * иначе StrictMode + HMR пересоздадут клиент на каждом рендере и сбросят кэш.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [client] = useState(() => createQueryClient());

    return (
        <QueryClientProvider client={client}>
            {children}
            {process.env.NODE_ENV === "development" ? (
                <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
            ) : null}
        </QueryClientProvider>
    );
}

import { Sidebar } from "@/components/application/Sidebar";
import { RealtimeProvider } from "@/lib/realtime";

/**
 * Layout для всех авторизованных страниц админки.
 * /login находится за пределами этой группы и не получает sidebar.
 *
 * `RealtimeProvider` живёт только здесь, чтобы Socket.IO не подключался
 * на странице логина (там cookie ещё нет, был бы лишний 401-цикл).
 */
export default function AuthenticatedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <RealtimeProvider>
            <div className="flex min-h-screen bg-secondary">
                <Sidebar />
                <main className="flex-1 overflow-x-hidden">{children}</main>
            </div>
        </RealtimeProvider>
    );
}

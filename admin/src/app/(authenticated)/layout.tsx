import { Sidebar } from "@/components/application/Sidebar";

/**
 * Layout для всех авторизованных страниц админки.
 * /login находится за пределами этой группы и не получает sidebar.
 */
export default function AuthenticatedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen bg-secondary">
            <Sidebar />
            <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
    );
}

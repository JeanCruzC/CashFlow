"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Resumen" },
    { href: "/dashboard/transactions", label: "Transacciones" },
    { href: "/dashboard/accounts", label: "Cuentas" },
    { href: "/dashboard/categories", label: "Categorías" },
    { href: "/dashboard/budget", label: "Presupuesto" },
    { href: "/dashboard/forecast", label: "Pronóstico" },
    { href: "/dashboard/settings", label: "Configuración" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex flex-col
                    bg-[var(--sidebar-bg)] border-r transition-all duration-300
                    ${collapsed ? "w-16" : "w-60"}`}
            >
                <div className="flex items-center gap-2 px-4 h-16 border-b">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                        <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path d="M4 14L9 9L13 13L20 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20 6V11" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            <path d="M20 6H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    {!collapsed && <span className="text-lg font-semibold truncate">CashFlow</span>}
                </div>

                <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto scrollbar-thin">
                    {NAV_ITEMS.map(({ href, label }) => {
                        const active =
                            href === "/dashboard"
                                ? pathname === href
                                : pathname === href || pathname.startsWith(`${href}/`);

                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
                                title={collapsed ? label : undefined}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`h-1.5 w-1.5 rounded-full transition-colors ${active ? "bg-brand-500" : "bg-surface-300 dark:bg-surface-600"}`}
                                />
                                {!collapsed && <span className="truncate">{label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t px-3 py-3 space-y-1">
                    <button
                        onClick={handleLogout}
                        className="sidebar-link w-full"
                        title={collapsed ? "Cerrar sesión" : undefined}
                    >
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-negative-500" />
                        {!collapsed && <span>Cerrar sesión</span>}
                    </button>
                </div>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full
                     bg-surface-0 dark:bg-surface-800 border shadow-sm
                     flex items-center justify-center text-surface-400
                     hover:text-surface-600 cursor-pointer transition-colors z-50"
                    aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
                >
                    <span className="text-xs font-semibold">{collapsed ? ">" : "<"}</span>
                </button>
            </aside>

            <main
                className={`flex-1 transition-all duration-300
                    ${collapsed ? "ml-16" : "ml-60"}`}
            >
                <div className="p-6 max-w-7xl mx-auto">{children}</div>
            </main>
        </div>
    );
}

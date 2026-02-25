"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_GROUPS = [
    {
        title: "Visión general",
        items: [
            { href: "/dashboard", label: "Resumen", description: "Salud financiera actual" },
            { href: "/dashboard/assistant", label: "Asistente financiero", description: "Recomendaciones guardadas" },
        ],
    },
    {
        title: "Registro diario",
        items: [
            { href: "/dashboard/transactions", label: "Movimientos", description: "Libro de ingresos y gastos" },
            { href: "/dashboard/budget", label: "Presupuesto", description: "Plan mensual vs ejecución" },
        ],
    },
    {
        title: "Planificación",
        items: [
            { href: "/dashboard/forecast", label: "Pronóstico", description: "Escenarios y proyección" },
            { href: "/dashboard/accounts", label: "Cuentas", description: "Balance de activos y pasivos" },
            { href: "/dashboard/categories", label: "Categorías", description: "Clasificación contable base" },
        ],
    },
    {
        title: "Administración",
        items: [
            { href: "/dashboard/settings", label: "Configuración", description: "Parámetros de la organización" },
        ],
    },
];


function currentSection(pathname: string) {
    for (const group of NAV_GROUPS) {
        for (const item of group.items) {
            if (item.href === "/dashboard" && pathname === "/dashboard") return item.label;
            if (item.href !== "/dashboard" && pathname.startsWith(item.href)) return item.label;
        }
    }
    return "CashFlow";
}

function isActivePath(pathname: string, href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({ children, hasTransactions = true }: { children: React.ReactNode, hasTransactions?: boolean }) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const prefetchedRoutesRef = useRef<Set<string>>(new Set());

    const [dismissCallout, setDismissCallout] = useState(false);

    const activeSection = useMemo(() => currentSection(pathname), [pathname]);

    function prefetchOnIntent(href: string) {
        if (prefetchedRoutesRef.current.has(href)) return;
        prefetchedRoutesRef.current.add(href);
        router.prefetch(href);
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f5f8fc_0%,#eef4fb_40%,#f8fbff_100%)]">
            <aside
                className={`fixed inset-y-0 left-0 z-40 border-r border-[#dfe7f2] bg-white/92 backdrop-blur transition-all duration-300 ${collapsed ? "w-20" : "w-[18.75rem]"
                    }`}
            >
                <div className="flex h-20 items-center border-b border-[#dfe7f2] px-5">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#0d4c7a,#117068)] text-sm font-bold text-white shadow-sm">
                        CF
                    </div>
                    {!collapsed ? (
                        <div>
                            <p className="text-sm font-semibold text-[#0f2233]">CashFlow</p>
                            <p className="text-xs text-surface-500">Workspace financiero</p>
                        </div>
                    ) : null}
                </div>

                <nav className="h-[calc(100%-10rem)] overflow-y-auto px-3 py-4 scrollbar-thin">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.title} className="mb-6">
                            {!collapsed ? (
                                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                                    {group.title}
                                </p>
                            ) : null}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const active = isActivePath(pathname, item.href);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            prefetch
                                            onMouseEnter={() => prefetchOnIntent(item.href)}
                                            onFocus={() => prefetchOnIntent(item.href)}
                                            className={`flex rounded-xl border px-3 py-2.5 transition-colors duration-150 ${active
                                                ? "border-[#0d4c7a]/20 bg-[#ebf3fb] text-[#0d4c7a]"
                                                : "border-transparent text-surface-600 hover:border-surface-200 hover:bg-surface-50 hover:text-surface-900"
                                                }`}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`mt-1.5 h-1.5 w-1.5 rounded-full ${active ? "bg-[#0d4c7a]" : "bg-surface-300"
                                                    }`}
                                            />
                                            {!collapsed ? (
                                                <span className="ml-3 block">
                                                    <span className="block text-sm font-semibold">{item.label}</span>
                                                    <span className="block text-xs text-surface-500">{item.description}</span>
                                                </span>
                                            ) : null}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-surface-200 p-3">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-negative-600 transition-colors hover:border-negative-100 hover:bg-negative-50"
                        title={collapsed ? "Cerrar sesión" : undefined}
                    >
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-negative-500" />
                        {!collapsed ? <span className="ml-3">Cerrar sesión</span> : null}
                    </button>
                </div>

                <button
                    onClick={() => setCollapsed((prev) => !prev)}
                    className="absolute -right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full border border-surface-200 bg-white text-xs font-semibold text-surface-500 shadow-sm transition-colors hover:text-surface-700"
                    aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
                >
                    {collapsed ? ">" : "<"}
                </button>
            </aside>

            <main
                className={`transition-all duration-300 ${collapsed ? "ml-20" : "ml-[18.75rem]"}`}
            >
                <div className="sticky top-0 z-20 border-b border-[#dfe7f2] bg-white/84 px-6 py-3.5 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-[84rem] items-center justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-400">Workspace</p>
                            <h1 className="text-base font-semibold text-[#0f2233]">{activeSection}</h1>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link href="/dashboard/transactions/new" className="btn-secondary text-xs no-underline">
                                Registrar movimiento
                            </Link>
                            <Link href="/dashboard/budget" className="btn-secondary text-xs no-underline">
                                Revisar presupuesto
                            </Link>
                            <Link href="/dashboard/settings" className="btn-secondary text-xs no-underline">
                                Configuración
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-[84rem] p-6">
                    {!hasTransactions && !dismissCallout && (
                        <section className="mb-6 rounded-2xl border border-[#b8d8f0] bg-[#edf6fd] px-5 py-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold text-[#0f2233]">Siguiente paso recomendado</h2>
                                    <p className="mt-1 text-sm text-surface-600 max-w-2xl">
                                        Tu entorno ya está creado. Para que el dashboard tenga valor real,
                                        registra tus primeros movimientos y luego valida el presupuesto.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setDismissCallout(true)}
                                        className="text-sm font-medium text-surface-500 hover:text-surface-700 transition"
                                    >
                                        Omitir
                                    </button>
                                    <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                                        Registrar primer movimiento
                                    </Link>
                                </div>
                            </div>
                        </section>
                    )}

                    {children}
                </div>
            </main>
        </div>
    );
}

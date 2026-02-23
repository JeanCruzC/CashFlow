"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_GROUPS = [
    {
        title: "Operación",
        items: [
            { href: "/dashboard", label: "Resumen", description: "Salud financiera actual" },
            { href: "/dashboard/transactions", label: "Transacciones", description: "Libro de movimientos" },
            { href: "/dashboard/accounts", label: "Cuentas", description: "Activos y pasivos base" },
            { href: "/dashboard/categories", label: "Clasificación", description: "Categorías personales y rubros (GL)" },
        ],
    },
    {
        title: "Planificación",
        items: [
            { href: "/dashboard/budget", label: "Presupuesto", description: "Plan vs ejecución real" },
            { href: "/dashboard/forecast", label: "Pronóstico", description: "Supuestos y proyección" },
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
    const [pendingHref, setPendingHref] = useState<string | null>(null);
    const [showLoadingHint, setShowLoadingHint] = useState(false);
    const prefetchedRoutesRef = useRef<Set<string>>(new Set());
    const loadingHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [dismissCallout, setDismissCallout] = useState(false);

    const activeSection = useMemo(() => currentSection(pathname), [pathname]);

    useEffect(() => {
        if (loadingHintTimerRef.current) {
            clearTimeout(loadingHintTimerRef.current);
            loadingHintTimerRef.current = null;
        }
        setPendingHref(null);
        setShowLoadingHint(false);
    }, [pathname]);

    useEffect(() => {
        return () => {
            if (loadingHintTimerRef.current) {
                clearTimeout(loadingHintTimerRef.current);
            }
        };
    }, []);

    function prefetchOnIntent(href: string) {
        if (prefetchedRoutesRef.current.has(href)) return;
        prefetchedRoutesRef.current.add(href);
        router.prefetch(href);
    }

    function markPendingNavigation(href: string, isActive: boolean) {
        if (isActive) return;
        setPendingHref(href);
        setShowLoadingHint(false);
        if (loadingHintTimerRef.current) {
            clearTimeout(loadingHintTimerRef.current);
        }
        loadingHintTimerRef.current = setTimeout(() => {
            setShowLoadingHint(true);
        }, 350);
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(165deg,#f7fbff_0%,#edf4fa_50%,#f8fbfd_100%)]">
            <aside
                className={`fixed inset-y-0 left-0 z-40 border-r border-surface-200 bg-white/90 backdrop-blur transition-all duration-300 ${collapsed ? "w-20" : "w-80"
                    }`}
            >
                <div className="flex h-20 items-center border-b border-surface-200 px-5">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#0d4c7a,#14847b)] text-sm font-bold text-white">
                        CF
                    </div>
                    {!collapsed ? (
                        <div>
                            <p className="text-sm font-semibold text-[#0f2233]">CashFlow</p>
                            <p className="text-xs text-surface-500">Plataforma financiera interna</p>
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
                                    const highlighted = active || pendingHref === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            prefetch={false}
                                            onMouseEnter={() => prefetchOnIntent(item.href)}
                                            onFocus={() => prefetchOnIntent(item.href)}
                                            onClick={() => markPendingNavigation(item.href, active)}
                                            className={`flex rounded-xl border px-3 py-2.5 transition-colors duration-150 ${highlighted
                                                ? "border-[#0d4c7a]/20 bg-[#ebf3fb] text-[#0d4c7a]"
                                                : "border-transparent text-surface-600 hover:border-surface-200 hover:bg-surface-50 hover:text-surface-900"
                                                }`}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`mt-1.5 h-1.5 w-1.5 rounded-full ${highlighted ? "bg-[#0d4c7a]" : "bg-surface-300"
                                                    }`}
                                            />
                                            {!collapsed ? (
                                                <span className="ml-3 block">
                                                    <span className="block text-sm font-semibold">{item.label}</span>
                                                    <span className="block text-xs text-surface-500">
                                                        {showLoadingHint && pendingHref === item.href ? "Cargando..." : item.description}
                                                    </span>
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
                aria-busy={showLoadingHint && pendingHref !== null}
                className={`transition-all duration-300 ${collapsed ? "ml-20" : "ml-80"}`}
            >
                <div className="sticky top-0 z-20 border-b border-surface-200 bg-white/80 px-6 py-3.5 backdrop-blur">
                    <div className="mx-auto w-full max-w-7xl">
                        <h1 className="text-base font-semibold text-[#0f2233]">{activeSection}</h1>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-7xl p-6">
                    {!hasTransactions && !dismissCallout && (
                        <section className="mb-6 rounded-2xl border border-[#b8d8f0] bg-[#edf6fd] px-5 py-4 shadow-sm animate-fade-in">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-base font-semibold text-[#0f2233]">¡Todo listo!</h2>
                                    <p className="mt-1 text-sm text-surface-600 max-w-2xl">
                                        Tu entorno de trabajo ya está configurado con las cuentas y categorías iniciales.
                                        Ahora la tarea principal es registrar tus movimientos diarios.
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

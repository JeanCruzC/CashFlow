"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setActiveWorkspace, WorkspaceSummary } from "@/app/actions/workspaces";

type NavItem = {
    href: string;
    label: string;
    description: string;
    cycleStep?: string;
};

const CORE_CYCLE_NAV: NavItem[] = [
    {
        href: "/dashboard",
        label: "Panorama",
        description: "Estado actual de tu ciclo mensual",
        cycleStep: "1",
    },
    {
        href: "/dashboard/transactions",
        label: "Registrar",
        description: "Ingresos y gastos del día",
        cycleStep: "2",
    },
    {
        href: "/dashboard/budget",
        label: "Controlar",
        description: "Plan vs ejecución",
        cycleStep: "3",
    },
    {
        href: "/dashboard/forecast",
        label: "Proyectar",
        description: "Escenarios del siguiente cierre",
        cycleStep: "4",
    },
];

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
    {
        title: "Ciclo mensual",
        items: CORE_CYCLE_NAV,
    },
    {
        title: "Soporte operativo",
        items: [
            {
                href: "/dashboard/accounts",
                label: "Balance y cuentas",
                description: "Activos, pasivos y estructura bancaria",
            },
            {
                href: "/dashboard/categories",
                label: "Clasificación",
                description: "Categorías y rubros contables",
            },
            {
                href: "/dashboard/assistant",
                label: "Asistente",
                description: "Recomendaciones y planes guardados",
            },
            {
                href: "/dashboard/settings",
                label: "Configuración",
                description: "Alta de cuentas, categorías y parámetros",
            },
        ],
    },
];

function currentSection(pathname: string) {
    for (const group of NAV_GROUPS) {
        for (const item of group.items) {
            if (item.href === "/dashboard" && pathname === "/dashboard") return "Panorama";
            if (item.href !== "/dashboard" && pathname.startsWith(item.href)) return item.label;
        }
    }
    return "CashFlow";
}

function isActivePath(pathname: string, href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({
    children,
    activeOrgId,
    workspaces,
}: {
    children: React.ReactNode;
    activeOrgId: string;
    workspaces: WorkspaceSummary[];
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const prefetchedRoutesRef = useRef<Set<string>>(new Set());
    const [selectedWorkspace, setSelectedWorkspace] = useState(activeOrgId);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [isSwitchingWorkspace, startWorkspaceTransition] = useTransition();

    useEffect(() => {
        setSelectedWorkspace(activeOrgId);
    }, [activeOrgId]);

    const activeSection = useMemo(() => currentSection(pathname), [pathname]);
    const activeDescription = useMemo(() => {
        for (const group of NAV_GROUPS) {
            const found = group.items.find((item) => isActivePath(pathname, item.href));
            if (found) return found.description;
        }
        return "Control financiero en un solo flujo operativo.";
    }, [pathname]);
    const activeWorkspace = useMemo(
        () => workspaces.find((workspace) => workspace.orgId === selectedWorkspace) || null,
        [workspaces, selectedWorkspace]
    );

    function prefetchOnIntent(href: string) {
        if (prefetchedRoutesRef.current.has(href)) return;
        prefetchedRoutesRef.current.add(href);
        router.prefetch(href);
    }

    function handleWorkspaceChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextOrgId = event.target.value;
        setSelectedWorkspace(nextOrgId);
        setWorkspaceError(null);

        if (!nextOrgId || nextOrgId === activeOrgId) return;

        startWorkspaceTransition(async () => {
            const result = await setActiveWorkspace(nextOrgId);
            if (result?.error) {
                setWorkspaceError(result.error);
                setSelectedWorkspace(activeOrgId);
                return;
            }
            router.refresh();
        });
    }

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#f3f8ff_0%,#eef4fb_42%,#f6f9fe_100%)]">
            <aside
                className={`fixed inset-y-0 left-0 z-40 border-r border-[#d9e2f0] bg-white/95 backdrop-blur transition-all duration-300 ${
                    collapsed ? "w-20" : "w-[19.5rem]"
                    }`}
            >
                <div className="flex h-20 items-center border-b border-[#d9e2f0] px-5">
                    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#0d4c7a,#117068)] text-sm font-bold text-white shadow-sm">
                        CF
                    </div>
                    {!collapsed ? (
                        <div>
                            <p className="text-sm font-semibold text-[#0f2233]">CashFlow</p>
                            <p className="text-xs text-surface-500">Ciclo financiero integrado</p>
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
                                            className={`flex rounded-xl border px-3 py-2.5 transition-colors duration-150 ${
                                                active
                                                    ? "border-[#0d4c7a]/25 bg-[#eaf3fd] text-[#0d4c7a]"
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
                                                    <span className="block text-sm font-semibold">
                                                        {item.cycleStep ? `${item.cycleStep}. ${item.label}` : item.label}
                                                    </span>
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

                <div className="absolute bottom-0 left-0 right-0 border-t border-[#d9e2f0] p-3">
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
                    className="absolute -right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full border border-[#d9e2f0] bg-white text-xs font-semibold text-surface-500 shadow-sm transition-colors hover:text-surface-700"
                    aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
                >
                    {collapsed ? ">" : "<"}
                </button>
            </aside>

            <main className={`transition-all duration-300 ${collapsed ? "ml-20" : "ml-[19.5rem]"}`}>
                <div className="sticky top-0 z-20 border-b border-[#d9e2f0] bg-white/86 px-6 py-4 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-[98rem] items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-400">Workspace interno</p>
                            <h1 className="text-lg font-semibold text-[#0f2233]">{activeSection}</h1>
                            <p className="text-xs text-surface-500">{activeDescription}</p>
                        </div>
                        <div className="flex flex-wrap items-start gap-3">
                            <div className="min-w-[15rem]">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-400">
                                    Workspace activo
                                </p>
                                <select
                                    value={selectedWorkspace}
                                    onChange={handleWorkspaceChange}
                                    disabled={workspaces.length <= 1 || isSwitchingWorkspace}
                                    className="input-field py-2 text-sm"
                                    aria-label="Seleccionar workspace activo"
                                >
                                    {workspaces.length === 0 ? (
                                        <option value={activeOrgId}>Workspace actual</option>
                                    ) : (
                                        workspaces.map((workspace) => (
                                            <option key={workspace.orgId} value={workspace.orgId}>
                                                {workspace.name} · {workspace.type === "business" ? "Empresa" : "Personal"}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <p className="mt-1 text-[11px] text-surface-500">
                                    {activeWorkspace
                                        ? `${activeWorkspace.currency} · ${activeWorkspace.role}`
                                        : "Sin datos de workspace"}
                                    {isSwitchingWorkspace ? " · Cambiando..." : ""}
                                </p>
                                {workspaceError ? (
                                    <p className="mt-1 text-[11px] text-negative-600">{workspaceError}</p>
                                ) : null}
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

                    <div className="mx-auto mt-4 w-full max-w-[98rem]">
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {CORE_CYCLE_NAV.map((item) => {
                                const active = isActivePath(pathname, item.href);
                                return (
                                    <Link
                                        key={`cycle-${item.href}`}
                                        href={item.href}
                                        className={`rounded-xl border px-3 py-2 text-sm no-underline transition-colors ${
                                            active
                                                ? "border-[#0d4c7a]/30 bg-[#eaf3fd] text-[#0d4c7a]"
                                                : "border-[#e3e9f4] bg-white text-surface-600 hover:border-[#cfd9ea] hover:text-[#0f2233]"
                                        }`}
                                    >
                                        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400">
                                            Paso {item.cycleStep}
                                        </span>
                                        <span className="block font-semibold">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-[98rem] p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

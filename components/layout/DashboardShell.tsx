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
};

const CYCLE_NAV: NavItem[] = [
    {
        href: "/dashboard",
        label: "Panorama",
        description: "Estado actual de tu ciclo mensual",
    },
    {
        href: "/dashboard/transactions",
        label: "Registrar",
        description: "Ingresos y gastos del día",
    },
    {
        href: "/dashboard/budget",
        label: "Controlar",
        description: "Plan vs ejecución",
    },
    {
        href: "/dashboard/forecast",
        label: "Proyectar",
        description: "Escenarios del siguiente cierre",
    },
];

const SUPPORT_NAV: NavItem[] = [
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
];

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
    { title: "Ciclo mensual", items: CYCLE_NAV },
    { title: "Soporte operativo", items: SUPPORT_NAV },
];

function isActivePath(pathname: string, href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
}

function currentSection(pathname: string) {
    for (const group of NAV_GROUPS) {
        for (const item of group.items) {
            if (isActivePath(pathname, item.href)) return item;
        }
    }
    return {
        label: "CashFlow",
        description: "Control financiero en un solo flujo operativo.",
    };
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
    const prefetchedRoutesRef = useRef<Set<string>>(new Set());

    const [mobileOpen, setMobileOpen] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState(activeOrgId);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [isSwitchingWorkspace, startWorkspaceTransition] = useTransition();

    useEffect(() => {
        setSelectedWorkspace(activeOrgId);
    }, [activeOrgId]);

    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const current = useMemo(() => currentSection(pathname), [pathname]);

    const workspaceOptions = useMemo(() => {
        const groups = new Map<string, WorkspaceSummary[]>();

        for (const workspace of workspaces) {
            const key = [
                workspace.name.trim().toLowerCase(),
                workspace.type,
                workspace.currency,
                workspace.role,
            ].join("|");

            if (!groups.has(key)) {
                groups.set(key, [workspace]);
                continue;
            }

            groups.get(key)!.push(workspace);
        }

        return Array.from(groups.values()).map((group) => {
            const selectedMatch =
                group.find((workspace) => workspace.orgId === selectedWorkspace) ||
                group.find((workspace) => workspace.orgId === activeOrgId);

            return selectedMatch || group[0];
        });
    }, [activeOrgId, selectedWorkspace, workspaces]);

    const activeWorkspace = useMemo(
        () => workspaces.find((workspace) => workspace.orgId === selectedWorkspace) || null,
        [workspaces, selectedWorkspace]
    );
    const canSwitchWorkspace = workspaceOptions.length > 1;

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
        <div className="min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#f0f6fd_48%,#f9fcff_100%)]">
            <div
                className={`fixed inset-0 z-40 bg-[#0f2233]/30 transition-opacity lg:hidden ${
                    mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setMobileOpen(false)}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[18.75rem] transform border-r border-[#d9e2f0] bg-white transition-transform duration-300 lg:translate-x-0 ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="border-b border-[#d9e2f0] px-5 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#0d4c7a,#117068)] text-sm font-bold text-white shadow-sm">
                            CF
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[#0f2233]">CashFlow</p>
                            <p className="text-xs text-surface-500">Ciclo financiero integrado</p>
                        </div>
                    </div>
                </div>

                <nav className="h-[calc(100%-15rem)] overflow-y-auto px-4 py-4 scrollbar-thin">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.title} className="mb-6">
                            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-surface-400">
                                {group.title}
                            </p>
                            <div className="space-y-1.5">
                                {group.items.map((item) => {
                                    const active = isActivePath(pathname, item.href);

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            prefetch
                                            onMouseEnter={() => prefetchOnIntent(item.href)}
                                            onFocus={() => prefetchOnIntent(item.href)}
                                            className={`block rounded-xl border px-3 py-2.5 no-underline transition-colors ${
                                                active
                                                    ? "border-[#0d4c7a]/25 bg-[#eaf3fd] text-[#0d4c7a]"
                                                    : "border-transparent text-surface-600 hover:border-[#d9e2f0] hover:bg-surface-50 hover:text-[#0f2233]"
                                            }`}
                                        >
                                            <p className="text-sm font-semibold">{item.label}</p>
                                            <p className="mt-0.5 text-xs text-surface-500">{item.description}</p>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-[#d9e2f0] bg-white px-4 py-3">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-negative-600 transition-colors hover:border-negative-100 hover:bg-negative-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            <div className="lg:pl-[18.75rem]">
                <header className="sticky top-0 z-30 border-b border-[#d9e2f0] bg-white/92 px-4 py-3 backdrop-blur md:px-6">
                    <div className="mx-auto flex w-full max-w-[108rem] items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileOpen((prev) => !prev)}
                                className="mt-0.5 rounded-lg border border-[#d9e2f0] px-2 py-1 text-sm text-surface-600 hover:bg-surface-50 lg:hidden"
                                aria-label="Abrir menú de navegación"
                            >
                                {mobileOpen ? "✕" : "☰"}
                            </button>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-400">
                                    Tu workspace
                                </p>
                                <h1 className="text-lg font-semibold text-[#0f2233]">{current.label}</h1>
                                <p className="text-xs text-surface-500">{current.description}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-start justify-end gap-2 md:gap-3">
                            <div className="min-w-[14rem] max-w-[20rem]">
                                {canSwitchWorkspace ? (
                                    <select
                                        value={selectedWorkspace}
                                        onChange={handleWorkspaceChange}
                                        disabled={isSwitchingWorkspace}
                                        className="input-field h-10 py-2 text-sm"
                                        aria-label="Seleccionar workspace activo"
                                    >
                                        {workspaceOptions.length === 0 ? (
                                            <option value={activeOrgId}>Workspace actual</option>
                                        ) : (
                                            workspaceOptions.map((workspace) => (
                                                <option key={workspace.orgId} value={workspace.orgId}>
                                                    {workspace.name} · {workspace.type === "business" ? "Empresa" : "Personal"}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                ) : (
                                    <div className="flex h-10 items-center rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-3 text-sm font-medium text-[#0f2233]">
                                        {activeWorkspace
                                            ? `${activeWorkspace.name} · ${activeWorkspace.type === "business" ? "Empresa" : "Personal"}`
                                            : "Workspace actual"}
                                    </div>
                                )}
                                <p className="mt-1 text-[11px] text-surface-500">
                                    {activeWorkspace
                                        ? `${activeWorkspace.currency} · ${activeWorkspace.role}`
                                        : "Sin datos de workspace"}
                                    {canSwitchWorkspace ? "" : " · Workspace unico"}
                                    {isSwitchingWorkspace ? " · Cambiando..." : ""}
                                </p>
                                {workspaceError ? (
                                    <p className="mt-1 text-[11px] text-negative-600">{workspaceError}</p>
                                ) : null}
                            </div>
                            <Link href="/dashboard/transactions/new" className="btn-primary h-10 text-xs no-underline hover:text-white">
                                + Nuevo movimiento
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-[108rem] px-4 py-6 md:px-6">{children}</main>
            </div>
        </div>
    );
}

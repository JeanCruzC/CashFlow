"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setActiveWorkspace, WorkspaceSummary } from "@/app/actions/workspaces";
import {
    LayoutDashboard,
    CalendarRange,
    Target,
    TrendingUp,
    Landmark,
    Tags,
    Sparkles,
    Settings,
} from "lucide-react";

type NavItem = {
    href: string;
    label: string;
    description: string;
    icon: ReactNode;
};

const CYCLE_NAV: NavItem[] = [
    {
        href: "/dashboard",
        label: "Hoy",
        description: "Dinero real, agenda y estado diario",
        icon: <LayoutDashboard size={16} strokeWidth={2} />,
    },
    {
        href: "/dashboard/transactions",
        label: "Registro por fecha",
        description: "Ingresa y revisa movimientos dia a dia",
        icon: <CalendarRange size={16} strokeWidth={2} />,
    },
    {
        href: "/dashboard/budget",
        label: "Plan mensual",
        description: "Define topes y compara contra lo real",
        icon: <Target size={16} strokeWidth={2} />,
    },
    {
        href: "/dashboard/forecast",
        label: "Proximo mes",
        description: "Simula como cierra el siguiente ciclo",
        icon: <TrendingUp size={16} strokeWidth={2} />,
    },
];

const SUPPORT_NAV: NavItem[] = [
    {
        href: "/dashboard/accounts",
        label: "Cuentas",
        description: "Saldos, deudas y estructura bancaria",
        icon: <Landmark size={16} strokeWidth={2} />,
    },
    {
        href: "/dashboard/categories",
        label: "Categorias",
        description: "Ordena ingresos, gastos y rubros",
        icon: <Tags size={16} strokeWidth={2} />,
    },
    {
        href: "/dashboard/assistant",
        label: "Recomendaciones",
        description: "Planes guardados y sugerencias IA",
        icon: <Sparkles size={16} strokeWidth={2} />,
    },
    {
        href: "/dashboard/settings",
        label: "Configuracion base",
        description: "Datos del perfil, cuentas y categorias",
        icon: <Settings size={16} strokeWidth={2} />,
    },
];

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
    { title: "Flujo diario", items: CYCLE_NAV },
    { title: "Configuracion", items: SUPPORT_NAV },
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
        <div className="min-h-screen bg-[linear-gradient(180deg,#f3f8fd_0%,#f8fbff_42%,#ffffff_100%)]">
            <div
                className={`fixed inset-0 z-40 bg-[#0a1a29]/45 transition-opacity lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                onClick={() => setMobileOpen(false)}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[18.75rem] transform border-r border-[#15344d] bg-[linear-gradient(180deg,#0a1a29_0%,#0f283d_55%,#123049_100%)] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="border-b border-[#15344d] px-5 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3b82f6] bg-[linear-gradient(145deg,#2563eb,#1d4ed8)] text-sm font-bold text-white shadow-sm">
                            CF
                        </div>
                        <div>
                            <p className="font-display text-base text-white">CashFlow</p>
                            <p className="text-xs text-[#9eb4bd]">Panel financiero operativo</p>
                        </div>
                    </div>
                </div>

                <nav className="h-[calc(100%-15rem)] overflow-y-auto px-4 py-4 scrollbar-thin">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.title} className="mb-6">
                            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#8ca4ae]">
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
                                            className={`block rounded-xl border px-3 py-2.5 no-underline transition-colors ${active
                                                ? "border-[#3b82f6] bg-[#1a4269] text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)]"
                                                : "border-transparent text-[#bccfd6] hover:border-[#215485] hover:bg-[#153a5c] hover:text-white"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className={`flex-shrink-0 ${active ? "opacity-100 text-[#60a5fa]" : "opacity-60"}`}>{item.icon}</span>
                                                <div>
                                                    <p className="text-sm font-semibold">{item.label}</p>
                                                    <p className={`mt-0.5 text-xs ${active ? "text-[#93c5fd]" : "text-[#8fa6c4]"}`}>{item.description}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 border-t border-[#15344d] bg-[#0a1a29] px-4 py-3">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[#7d9eb0] transition-colors hover:border-[#1a4269] hover:bg-[#1a4269] hover:text-white"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            <div className="lg:pl-[18.75rem]">
                <header className="sticky top-0 z-30 border-b border-[#d6e3f0] bg-[rgba(255,255,255,0.92)] px-4 py-3 backdrop-blur md:px-6">
                    <div className="mx-auto flex w-full max-w-[108rem] items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileOpen((prev) => !prev)}
                                className="mt-0.5 rounded-lg border border-[#d6e3f0] px-2 py-1 text-sm text-surface-700 hover:bg-[#f3f8fd] lg:hidden"
                                aria-label="Abrir menú de navegación"
                            >
                                {mobileOpen ? "✕" : "☰"}
                            </button>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0d4c7a]">
                                    Tu workspace
                                </p>
                                <h1 className="font-display text-2xl text-[#10283b]">{current.label}</h1>
                                <p className="text-xs text-surface-600">{current.description}</p>
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
                                    <div className="flex h-10 items-center rounded-xl border border-[#d6e3f0] bg-[#f8fbff] px-3 text-sm font-medium text-[#10283b]">
                                        {activeWorkspace
                                            ? `${activeWorkspace.name} · ${activeWorkspace.type === "business" ? "Empresa" : "Personal"}`
                                            : "Workspace actual"}
                                    </div>
                                )}
                                <p className="mt-1 text-[11px] text-surface-600">
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

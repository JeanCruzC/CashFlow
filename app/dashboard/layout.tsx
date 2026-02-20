"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
    LayoutDashboard,
    ArrowLeftRight,
    Wallet,
    Tags,
    Target,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
    { href: "/dashboard/accounts", label: "Accounts", icon: Wallet },
    { href: "/dashboard/categories", label: "Categories", icon: Tags },
    { href: "/dashboard/budget", label: "Budget", icon: Target },
    { href: "/dashboard/forecast", label: "Forecast", icon: BarChart3, disabled: true },
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
                {/* Logo */}
                <div className="flex items-center gap-2 px-4 h-16 border-b">
                    <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                        <BarChart3 size={18} className="text-white" />
                    </div>
                    {!collapsed && <span className="text-lg font-semibold truncate">CashFlow</span>}
                </div>

                {/* Nav */}
                <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto scrollbar-thin">
                    {NAV_ITEMS.map(({ href, label, icon: Icon, disabled }) => {
                        const active = pathname === href;
                        const disabledLabel = `${label} (Próximamente)`;

                        if (disabled) {
                            return (
                                <div
                                    key={href}
                                    className="sidebar-link opacity-50 cursor-not-allowed"
                                    title={collapsed ? disabledLabel : undefined}
                                    aria-disabled="true"
                                >
                                    <Icon size={18} className="flex-shrink-0" />
                                    {!collapsed && <span className="truncate">{disabledLabel}</span>}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
                                title={collapsed ? label : undefined}
                            >
                                <Icon size={18} className="flex-shrink-0" />
                                {!collapsed && <span className="truncate">{label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom actions */}
                <div className="border-t px-3 py-3 space-y-1">
                    <div
                        className="sidebar-link opacity-50 cursor-not-allowed"
                        title={collapsed ? "Settings (Próximamente)" : undefined}
                        aria-disabled="true"
                    >
                        <Settings size={18} className="flex-shrink-0" />
                        {!collapsed && <span>Settings (Próximamente)</span>}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="sidebar-link w-full"
                        title={collapsed ? "Sign Out" : undefined}
                    >
                        <LogOut size={18} className="flex-shrink-0" />
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full
                     bg-surface-0 dark:bg-surface-800 border shadow-sm
                     flex items-center justify-center text-surface-400
                     hover:text-surface-600 cursor-pointer transition-colors z-50"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>
            </aside>

            {/* Main content */}
            <main
                className={`flex-1 transition-all duration-300
                    ${collapsed ? "ml-16" : "ml-60"}`}
            >
                <div className="p-6 max-w-7xl mx-auto">{children}</div>
            </main>
        </div>
    );
}

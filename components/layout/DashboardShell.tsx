"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setActiveWorkspace, WorkspaceSummary } from "@/app/actions/workspaces";
import { type GamificationState } from "@/app/actions/gamification";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { LevelUpPopup } from "@/components/ui/LevelUpPopup";

// Redesign SVG Icons
const IconHome = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
const IconMovements = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>;
const IconPlan = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
const IconNext = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;

const IconAccounts = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>;
const IconCategories = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>;
const IconRecommendations = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;

type NavItem = {
    href: string;
    label: string;
    icon: ReactNode;
    badge?: number;
};

const CYCLE_NAV: NavItem[] = [
    { href: "/dashboard", label: "Hoy", icon: IconHome },
    { href: "/dashboard/transactions", label: "Movimientos", icon: IconMovements, badge: 3 },
    { href: "/dashboard/budget", label: "Plan mensual", icon: IconPlan },
    { href: "/dashboard/forecast", label: "Próximo mes", icon: IconNext },
];

const SUPPORT_NAV: NavItem[] = [
    { href: "/dashboard/accounts", label: "Cuentas", icon: IconAccounts },
    { href: "/dashboard/categories", label: "Categorías", icon: IconCategories },
    { href: "/dashboard/assistant", label: "Recomendaciones", icon: IconRecommendations },
];

const NAV_GROUPS = [
    { title: "Flujo diario", items: CYCLE_NAV },
    { title: "Configuración", items: SUPPORT_NAV },
];

function isActivePath(pathname: string, href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
}

// ── CONFETTI & REWARD POPUP SYSTEM
const rwdData: Record<string, { ttl: string; sub: string; xp: string; ico: string }> = {
    income: { ttl: '¡Ingreso registrado!', sub: 'Tu saldo sigue creciendo. Así se hace.', xp: '+30 XP', ico: 'ok' },
    expense: { ttl: '¡Gasto anotado!', sub: 'Controlar tus gastos te hace libre.', xp: '+10 XP', ico: 'ng' },
    transfer: { ttl: '¡Transferencia lista!', sub: 'Tus cuentas cada vez más ordenadas.', xp: '+20 XP', ico: 'acc' },
    save: { ttl: '¡Ahorraste dinero!', sub: 'Tu alcancía creció hoy. Orgullo total.', xp: '+50 XP', ico: 'wa' },
    streak: { ttl: '¡7 días seguidos!', sub: 'Eres imparable. La racha sigue viva.', xp: '+100 XP', ico: 'wa' },
    plan: { ttl: '¡Plan mensual listo!', sub: 'Ahora tienes el control total del mes.', xp: '+200 XP', ico: 'acc' },
    register: { ttl: '¡Registrado!', sub: 'Cada movimiento construye tu futuro.', xp: '+25 XP', ico: 'acc' },
};
const icoSvg: Record<string, ReactNode> = {
    ok: <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="#e0faf3" /><path d="M17 29l8 8 14-14" stroke="#00c48c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>,
    ng: <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="#ffecee" /><path d="M20 20l16 16M36 20L20 36" stroke="#ff4757" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>,
    acc: <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="#eeecff" /><path d="M28 16v12l7 7" stroke="#6c63ff" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>,
    wa: <svg width="56" height="56" viewBox="0 0 56 56"><polygon points="28 4 34 18 50 20 38 32 42 48 28 40 14 48 18 32 6 20 22 18" fill="#ffa502" /></svg>,
};

function triggerConfetti() {
    const cols = ['#6c63ff', '#ffa502', '#00c48c', '#ff4757'];
    for (let i = 0; i < 42; i++) {
        const el = document.createElement('div');
        el.className = 'cf';
        const x = (Math.random() - .5) * 320, d = .6 + Math.random() * .7, dl = Math.random() * .3;
        el.style.cssText = `left:${36 + Math.random() * 28}%;top:${20 + Math.random() * 30}%;width:${5 + Math.random() * 7}px;height:${5 + Math.random() * 7}px;background:${cols[Math.floor(Math.random() * cols.length)]};--x:${x}px;--d:${d}s;--dl:${dl}s;border-radius:${Math.random() > .45 ? '50%' : '3px'}`;
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }
}

export function dispatchRewardPopup(type = 'register') {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('showCashflowPopup', { detail: { type } }));
    }
}

export default function DashboardShell({
    children,
    activeOrgId,
    workspaces,
    gamification,
}: {
    children: React.ReactNode;
    activeOrgId: string;
    workspaces: WorkspaceSummary[];
    gamification: GamificationState | null;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const prefetchedRoutesRef = useRef<Set<string>>(new Set());

    const [selectedWorkspace, setSelectedWorkspace] = useState(activeOrgId);
    const [isSwitchingWorkspace, startWorkspaceTransition] = useTransition();

    const [popOn, setPopOn] = useState(false);
    const [popType, setPopType] = useState('register');

    const [levelUpData, setLevelUpData] = useState<{ show: boolean; level: number }>({ show: false, level: 0 });

    const [pigTip, setPigTip] = useState('¡Ahorra hoy y gana una medalla!');

    useEffect(() => {
        const tips = ['¡Ahorra hoy y gana una medalla!', '7 días seguidos. ¡No pares!', 'Tu meta al 40%, sigue adelante', '¡Un reto nuevo te espera!', 'Registra hoy, sube de nivel mañana', 'Pequeños ahorros, grandes cambios'];
        let ti = 0;
        const iv = setInterval(() => { ti = (ti + 1) % tips.length; setPigTip(tips[ti]); }, 4500);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        const listener = (e: Event) => {
            const ev = e as CustomEvent;
            setPopType(ev.detail?.type || 'register');
            setPopOn(true);
            triggerConfetti();
        };
        const levelUpListener = (e: Event) => {
            const ev = e as CustomEvent;
            setLevelUpData({ show: true, level: ev.detail?.level || 2 });
        };
        window.addEventListener('showCashflowPopup', listener);
        window.addEventListener('showLevelUpPopup', levelUpListener);
        return () => {
            window.removeEventListener('showCashflowPopup', listener);
            window.removeEventListener('showLevelUpPopup', levelUpListener);
        };
    }, []);

    useEffect(() => {
        setSelectedWorkspace(activeOrgId);
    }, [activeOrgId]);

    const workspaceOptions = useMemo(() => {
        const groups = new Map<string, WorkspaceSummary[]>();

        for (const workspace of workspaces) {
            const key = [workspace.name.trim().toLowerCase(), workspace.type, workspace.currency, workspace.role].join("|");
            if (!groups.has(key)) {
                groups.set(key, [workspace]);
                continue;
            }
            groups.get(key)!.push(workspace);
        }

        return Array.from(groups.values()).map((group) => {
            const selectedMatch = group.find((w) => w.orgId === selectedWorkspace) || group.find((w) => w.orgId === activeOrgId);
            return selectedMatch || group[0];
        });
    }, [activeOrgId, selectedWorkspace, workspaces]);

    const activeWorkspace = useMemo(
        () => workspaces.find((workspace) => workspace.orgId === selectedWorkspace) || workspaces[0] || null,
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

        if (!nextOrgId || nextOrgId === activeOrgId) return;

        startWorkspaceTransition(async () => {
            const result = await setActiveWorkspace(nextOrgId);
            if (result?.error) {
                console.error(result.error);
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

    const currentPop = rwdData[popType] || rwdData.register;

    return (
        <div className="layout text-[var(--tx)] font-[var(--font-body)]">

            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="sb-logo">
                    <div className="sb-mark">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
                    </div>
                    <span className="sb-name">CashFlow</span>
                </div>

                <nav className="sb-nav">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.title} className="sb-sec">
                            <div className="sb-sec-lbl">{group.title}</div>
                            {group.items.map((item) => {
                                const on = isActivePath(pathname, item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch
                                        onMouseEnter={() => prefetchOnIntent(item.href)}
                                        className={`sb-lnk ${on ? 'on' : ''}`}
                                    >
                                        {item.icon}
                                        {item.label}
                                        {item.badge ? <span className="sb-badge">{item.badge}</span> : null}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sb-streak" onClick={() => dispatchRewardPopup('streak')}>
                    <div className="sb-str-row">
                        <svg className="sb-fire" width="22" height="22" viewBox="0 0 24 24" fill="#ffa502">
                            <path d="M12 2c0 0-6 5-6 11a6 6 0 0012 0c0-6-6-11-6-11z" />
                            <path d="M12 8c0 0-3 3-3 6a3 3 0 006 0c0-3-3-6-3-6z" fill="#ffcc5c" opacity=".8" />
                        </svg>
                        <div>
                            <div className="sb-str-lbl">Racha de ahorro</div>
                            <div className="sb-str-val">{gamification?.current_streak || 0} días</div>
                        </div>
                    </div>
                    <div className="sb-str-sub">Racha máxima: {gamification?.highest_streak || 0} días</div>
                    <div className="sb-dots">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`sd ${(gamification?.current_streak || 0) > i ? 'lit' : ''}`}></div>
                        ))}
                    </div>
                </div>

                <div className="sb-bottom">
                    <div className="sb-user" onClick={handleLogout} title="Cerrar sesión">
                        <div className="sb-avi">CF</div>
                        <div>
                            <div className="sb-uname">Mi espacio</div>
                            <div className="sb-uplan">Plan Activo</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="main">
                <div className="topbar">
                    <div className="tb-greet">
                        {activeWorkspace ? (
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedWorkspace}
                                    onChange={handleWorkspaceChange}
                                    disabled={isSwitchingWorkspace}
                                    className="bg-transparent border-none outline-none font-bold text-[var(--tx)] cursor-pointer appearance-none"
                                >
                                    {workspaceOptions.map((workspace) => (
                                        <option key={workspace.orgId} value={workspace.orgId}>
                                            {workspace.name} {workspace.type === "business" ? "(Empresa)" : "(Personal)"}
                                        </option>
                                    ))}
                                </select>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-60"><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                        ) : (
                            <span>Buenos días, <b>campeón</b></span>
                        )}
                    </div>

                    <div className="tb-search" style={{ fontFamily: 'var(--font-body)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        Buscar movimientos…
                    </div>

                    <div className="tb-notif">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
                        <span className="tb-ndot"></span>
                    </div>

                    <Link href="/dashboard/transactions/new" className="tb-cta">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Nuevo movimiento
                    </Link>
                </div>

                <div className="page">
                    {children}
                </div>
            </main>

            {/* MASCOT PIG */}
            <div id="pig">
                <div className="p-bbl" id="pigTip">{pigTip}</div>
                <svg className="p-svg" width="64" height="64" viewBox="0 0 100 100" fill="none">
                    <ellipse cx="50" cy="60" rx="30" ry="27" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="2" />
                    <ellipse cx="50" cy="60" rx="26" ry="23" fill="#fff" />
                    <ellipse cx="50" cy="70" rx="9" ry="6" fill="#eef0f6" />
                    <circle cx="46.5" cy="70" r="2" fill="#6c63ff" opacity=".55" />
                    <circle cx="53.5" cy="70" r="2" fill="#6c63ff" opacity=".55" />
                    <circle cx="37" cy="53" r="3" fill="#6c63ff" />
                    <circle cx="63" cy="53" r="3" fill="#6c63ff" />
                    <rect x="44" y="33" width="12" height="3.5" rx="1.75" fill="#ffa502" />
                    <ellipse cx="21" cy="54" rx="6" ry="8" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                    <ellipse cx="79" cy="54" rx="6" ry="8" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                    <path d="M44 75 Q50 79 56 75" stroke="#6c63ff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <rect x="31" y="82" width="9" height="11" rx="4.5" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                    <rect x="45" y="82" width="9" height="11" rx="4.5" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                    <rect x="59" y="82" width="9" height="11" rx="4.5" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                    <path d="M79 65 Q89 57 85 71" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <ellipse cx="30" cy="64" rx="5" ry="3" fill="#ff4757" opacity=".12" />
                    <ellipse cx="70" cy="64" rx="5" ry="3" fill="#ff4757" opacity=".12" />
                    <ellipse cx="50" cy="94" rx="16" ry="2.5" fill="#6c63ff" opacity=".06" />
                </svg>
            </div>

            {/* REWARD POPUP OVERLAY */}
            <div id="ov" className={popOn ? 'on' : ''} onClick={() => setPopOn(false)}></div>
            <div id="pop" className={popOn ? 'on' : ''}>
                <div className={`pop-ico ${popOn ? 'animation-popIn' : ''}`}>
                    {icoSvg[currentPop.ico] || icoSvg.ok}
                </div>
                <div className="pop-ttl">{currentPop.ttl}</div>
                <div className="pop-sub">{currentPop.sub}</div>
                <div className="pop-xp">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    {currentPop.xp}
                </div>
                <button className="pop-btn" onClick={() => setPopOn(false)}>¡Genial, siguiente!</button>
            </div>

            <style jsx>{`
                .animation-popIn {
                    animation: popIn .45s cubic-bezier(.34,1.56,.64,1);
                }
            `}</style>
            <GlobalLoader />
            <LevelUpPopup
                show={levelUpData.show}
                level={levelUpData.level}
                onClose={() => setLevelUpData({ ...levelUpData, show: false })}
            />
        </div>
    );
}

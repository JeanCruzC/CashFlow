import Link from "next/link";
import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";
import { getUserGamification } from "@/app/actions/gamification";
import { ModuleHero } from "@/components/ui/ModuleHero";

type Locale = "es" | "en";

interface RecentMovement {
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: string;
    accountName: string;
    categoryName: string;
}

function formatter(locale: Locale, currency: string) {
    const language = locale === "en" ? "en-US" : "es-PE";

    return {
        money: new Intl.NumberFormat(language, { style: "currency", currency }),
        moneyCompact: new Intl.NumberFormat(language, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }),
        percent: new Intl.NumberFormat(language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        dayMonth: new Intl.DateTimeFormat(language, {
            day: "numeric",
            month: "long",
        }),
        dayMonthShort: new Intl.DateTimeFormat(language, {
            day: "numeric",
            month: "short",
        }),
    };
}



function goalProgress(currentAmount: number, targetAmount: number) {
    if (targetAmount <= 0) return 0;
    return Math.min((currentAmount / targetAmount) * 100, 100);
}

function startOfDay(date: Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function isSameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function mapRecentMovements(raw: Array<Record<string, unknown>>): RecentMovement[] {
    return raw.map((row) => {
        const accountJoin = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
        const categoryJoin = Array.isArray(row.categories_gl) ? row.categories_gl[0] : row.categories_gl;

        return {
            id: String(row.id || ""),
            date: String(row.date || ""),
            description: String(row.description || "Sin descripcion"),
            amount: Number(row.amount || 0),
            currency: String(row.currency || "USD"),
            accountName: String((accountJoin as { name?: string } | null)?.name || "Sin cuenta"),
            categoryName: String((categoryJoin as { name?: string } | null)?.name || "Sin categoria"),
        };
    });
}

function groupMovementsByDate(items: RecentMovement[]) {
    const map = new Map<string, RecentMovement[]>();
    for (const item of items) {
        const key = item.date;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, rows]) => {
            const income = rows.filter((row) => row.amount >= 0).reduce((sum, row) => sum + row.amount, 0);
            const expense = rows.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0);
            return {
                date,
                rows,
                income,
                expense,
                net: income - expense,
            };
        });
}


export default async function DashboardPage() {
    const [kpiBundle, recentRaw, gamification] = await Promise.all([
        getDashboardKPIs(),
        getRecentTransactions(),
        getUserGamification()
    ]);
    const recentMovements = mapRecentMovements((recentRaw || []) as Array<Record<string, unknown>>);
    const groupedDailyMovements = groupMovementsByDate(recentMovements);

    const format = formatter(kpiBundle.locale, kpiBundle.currency);
    const isBusiness = kpiBundle.orgType === "business";

    if (isBusiness) {
        const business = kpiBundle.business;

        return (
            <div className="space-y-6 animate-fade-in">
                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card md:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
                        Panel ejecutivo
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Resumen de negocio</h2>
                    <p className="mt-2 text-sm text-surface-600">
                        Vista limpia de ingresos, costos y resultado operativo del mes.
                    </p>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <article className="rounded-2xl border border-[#d9e2f0] bg-[#f8fbff] p-4">
                            <p className="text-xs font-medium text-surface-500">Revenue</p>
                            <p className="mt-1 text-2xl font-semibold text-[#0f2233]">
                                {format.moneyCompact.format(business?.revenue || 0)}
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-[#f8fbff] p-4">
                            <p className="text-xs font-medium text-surface-500">OPEX</p>
                            <p className="mt-1 text-2xl font-semibold text-[#0f2233]">
                                {format.moneyCompact.format(business?.opex || 0)}
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-[#f8fbff] p-4">
                            <p className="text-xs font-medium text-surface-500">Margen operativo</p>
                            <p className="mt-1 text-2xl font-semibold text-[#0f2233]">
                                {format.percent.format(business?.operatingMarginPct || 0)}%
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-[#f8fbff] p-4">
                            <p className="text-xs font-medium text-surface-500">Forecast EBIT</p>
                            <p
                                className={`mt-1 text-2xl font-semibold ${(business?.forecastEbit || 0) >= 0
                                    ? "text-positive-600"
                                    : "text-negative-600"
                                    }`}
                            >
                                {format.moneyCompact.format(business?.forecastEbit || 0)}
                            </p>
                        </article>
                    </div>
                </section>

                <p className="mt-1 text-sm text-surface-500">Vista limpia de ingresos, costos y resultado operativo.</p>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════════════
       PERSONAL DASHBOARD
       ══════════════════════════════════════════════════════════════════════ */

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const personal = kpiBundle.personal;
    const cycle = kpiBundle.personalCycle;
    const savingsGoals = kpiBundle.savingsGoals || [];

    const availableNow = personal?.liquidCash || 0;

    const topGoal = savingsGoals[0] || null;
    const topGoalProgress = topGoal ? goalProgress(topGoal.current_amount, topGoal.target_amount) : 0;

    const scheduleReview = cycle?.scheduleReview || null;
    const reviewItems = scheduleReview?.items || [];

    const todayMovements = recentMovements.filter((m) => {
        const d = startOfDay(new Date(m.date));
        return isSameDay(d, todayStart);
    });
    const todayIncome = todayMovements.filter((m) => m.amount >= 0).reduce((s, m) => s + m.amount, 0);
    const todayExpense = todayMovements.filter((m) => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0);
    const todayNet = todayIncome - todayExpense;

    const monthPlanTotal = Number(kpiBundle.budgetTotal || 0);
    const monthActualTotal = Number(kpiBundle.budgetUsed || 0);
    const hasMonthPlan = monthPlanTotal > 0;
    const monthUsagePct = hasMonthPlan ? Math.min((monthActualTotal / monthPlanTotal) * 100, 100) : 0;

    const dispatchPopup = (type: string) => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("showCashflowPopup", { detail: { type } }));
        }
    };

    const xpPoints = gamification?.xp_points || 0;
    const currentLevel = gamification?.current_level || 1;
    const xpBase = (currentLevel - 1) * 100;
    const xpProgress = xpPoints - xpBase;
    const xpPercentage = Math.min((xpProgress / 100) * 100, 100);

    return (
        <div className="min-h-screen">
            <div className="xp-strip fu in" style={{ transitionDelay: "0s" }}>
                <div className="xp-lvl">Nv. {currentLevel}</div>
                <div className="xp-mid">
                    <div className="xp-meta">
                        <span>Ahorrador Inteligente</span>
                        <strong>{xpPoints} / {currentLevel * 100} XP</strong>
                    </div>
                    <div className="xp-track"><div className="xp-fill" style={{ width: `${xpPercentage}%` }}></div></div>
                </div>
                <div className="xp-badges">
                    <div className="xp-b" title="Primer ahorro"><svg width="15" height="15" viewBox="0 0 24 24" fill="#ffa502"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></div>
                    <div className="xp-b" title="7 días de racha"><svg width="15" height="15" viewBox="0 0 24 24" fill="#ff4757"><path d="M12 2c0 0-6 5-6 11a6 6 0 0012 0c0-6-6-11-6-11z" /></svg></div>
                    <div className="xp-b" title="Meta cumplida"><svg width="15" height="15" viewBox="0 0 24 24" fill="#6c63ff"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
                    <div className="xp-b lock" title="Desbloquea en nivel 5"><svg width="15" height="15" viewBox="0 0 24 24" fill="#b8bec8"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div>
                </div>
            </div>

            <ModuleHero
                eyebrow={`PANEL DIARIO · ${format.dayMonth.format(today).toUpperCase()}`}
                title="Saldo total disponible"
                description={<>Banco y efectivo <span className="hero-pill"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15" /></svg> +12.3% este mes</span></>}
                actions={
                    <>
                        <button className="h-btn1" onClick={() => dispatchPopup("register")}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Registrar movimiento
                        </button>
                        <Link href="/dashboard/transactions" className="h-btn2 no-underline">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> Ver detalle
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <div className="h-stat">
                            <div className="h-stat-lbl"><span className="h-dot" style={{ background: "#5effd5" }}></span>Ingresos del mes</div>
                            <div className="h-stat-n" style={{ color: "#5effd5" }}>{format.money.format(todayIncome || 3200)}</div>
                        </div>
                        <div className="h-stat">
                            <div className="h-stat-lbl"><span className="h-dot" style={{ background: "#ffb3bc" }}></span>Gastos del mes</div>
                            <div className="h-stat-n" style={{ color: "#ffb3bc" }}>{format.money.format(todayExpense || 1700)}</div>
                        </div>
                        <div className="h-stat">
                            <div className="h-stat-lbl"><span className="h-dot" style={{ background: "rgba(255,255,255,.5)" }}></span>Neto</div>
                            <div className="h-stat-n" style={{ color: "#fff" }}>{format.money.format(todayNet || 1500)}</div>
                        </div>
                    </>
                }
            >
                {format.money.format(availableNow)}
            </ModuleHero>

            <div className="sh fu in" style={{ transitionDelay: ".08s" }}>
                <div className="sh-t">Acciones rápidas</div>
                <div className="sh-chip">Lo más usado</div>
            </div>
            <div className="qa fu in" style={{ transitionDelay: ".1s" }}>
                <div className="qa-c q1" onClick={() => dispatchPopup("income")}>
                    <div className="qa-ico i1"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00c48c" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 5 5 12" /></svg></div>
                    <span className="qa-lbl">Añadir Ingreso</span>
                </div>
                <div className="qa-c q2" onClick={() => dispatchPopup("expense")}>
                    <div className="qa-ico i2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="5 12 12 19 19 12" /></svg></div>
                    <span className="qa-lbl">Añadir Gasto</span>
                </div>
                <div className="qa-c q3" onClick={() => dispatchPopup("transfer")}>
                    <div className="qa-ico i3"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2.5"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" /></svg></div>
                    <span className="qa-lbl">Transferir</span>
                </div>
                <div className="qa-c q4" onClick={() => dispatchPopup("save")}>
                    <div className="qa-ico i4"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffa502" strokeWidth="2.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V9a1 1 0 011-1h2a1 1 0 011 1v11m-4 0h4" /></svg></div>
                    <span className="qa-lbl">Guardar / Ahorrar</span>
                </div>
            </div>

            <div className="g2 fu in" style={{ transitionDelay: ".13s" }}>
                <div className="c">
                    <div className="c-head">
                        <div className="c-t">Movimientos recientes</div>
                        <Link href="/dashboard/transactions" className="c-a no-underline">Ver todos</Link>
                    </div>
                    {groupedDailyMovements.length === 0 ? (
                        <div className="text-center py-6 text-[var(--tx2)] text-sm font-medium">No hay movimientos.</div>
                    ) : (
                        <div className="tx-ls">
                            {groupedDailyMovements[0]?.rows.slice(0, 4).map((mov) => (
                                <div key={mov.id} className="tx">
                                    <div className="tx-ico" style={{ background: mov.amount >= 0 ? "var(--ok-l)" : "var(--ng-l)" }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={mov.amount >= 0 ? "#00c48c" : "#ff4757"} strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                    </div>
                                    <div className="tx-b"><div className="tx-n">{mov.description}</div><div className="tx-s">{mov.categoryName}</div></div>
                                    <div className="tx-r"><div className={`tx-a ${mov.amount >= 0 ? "pos" : "neg"}`}>{mov.amount >= 0 ? "+" : "−"}{format.money.format(Math.abs(mov.amount))}</div><div className="tx-t">Reciente</div></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-[15px]">
                    <div className="goal">
                        <div className="c-head">
                            <div className="c-t"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffa502" strokeWidth="2.5" style={{ marginRight: 5, verticalAlign: "-1px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> Meta de ahorro</div>
                            <div className="c-a !text-[var(--wa)]">Editar</div>
                        </div>
                        {topGoal ? (
                            <>
                                <div className="goal-lbl">Objetivo activo</div>
                                <div className="goal-name">{topGoal.name}</div>
                                <div className="goal-track"><div className="goal-fill" style={{ width: `${topGoalProgress}%` }}></div></div>
                                <div className="goal-row"><span>Guardado: <b>{format.money.format(topGoal.current_amount)}</b></span><span>{format.money.format(topGoal.target_amount)} — <b>{format.percent.format(topGoalProgress)}%</b></span></div>
                            </>
                        ) : (
                            <div className="text-sm text-[var(--tx2)] font-medium">No tienes metas de ahorro configuradas.</div>
                        )}
                    </div>

                    <div className="c">
                        <div className="c-head"><div className="c-t">Tu mes</div><div className="c-a">Ver detalle</div></div>
                        <div className="sp-ls">
                            <div>
                                <div className="sp-h"><div className="sp-l"><span className="sp-dot bg-[#ff4757]"></span>Gastado</div><div className="text-[13px] font-bold text-[#ff4757]">{format.money.format(monthActualTotal)}</div></div>
                                <div className="sp-track"><div className="sp-bar bg-[#ff4757]" style={{ width: `${Math.min(monthUsagePct, 100)}%` }}></div></div>
                            </div>
                            <div>
                                <div className="sp-h"><div className="sp-l"><span className="sp-dot bg-[#6c63ff]"></span>Presupuesto</div><div className="text-[13px] font-bold text-[#6c63ff]">{format.money.format(monthPlanTotal)}</div></div>
                                <div className="sp-track"><div className="sp-bar bg-[#6c63ff]" style={{ width: '100%' }}></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="g3 fu in" style={{ transitionDelay: ".18s" }}>
                <div className="c">
                    <div className="c-head"><div className="c-t">Agenda de cobros</div><div className="c-a">Ver mes</div></div>
                    {reviewItems.length === 0 ? (
                        <div className="text-center py-4 text-[var(--tx2)] text-sm">Sin eventos en agenda.</div>
                    ) : (
                        <div className="ag-ls">
                            {reviewItems.slice(0, 3).map((event) => (
                                <div key={event.id} className="ag">
                                    <div className="ag-dt"><div className="ag-d">{new Date(event.dueDate).getDate()}</div><div className="ag-m">Mar</div></div>
                                    <div className="ag-info"><div className="ag-n">{event.title}</div><div className="ag-s">{event.subtitle}</div></div>
                                    <div className="ag-a text-[var(--tx2)]">...</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="c">
                    <div className="c-head"><div className="c-t">Retos de ahorro</div><div className="c-a">Ver todos</div></div>
                    <div className="ch-g">
                        <div className="ch done" onClick={() => dispatchPopup("streak")}>
                            <div className="ch-bdg b-done">Hecho</div>
                            <div className="ch-ico"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#00c48c" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></div>
                            <div className="ch-n">Sin café afuera</div>
                            <div className="ch-d">Ahorra S/ 50</div>
                        </div>
                        <div className="ch">
                            <div className="ch-bdg b-hot">Activo</div>
                            <div className="ch-ico"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#ffa502" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
                            <div className="ch-n">Reto 30 días</div>
                            <div className="ch-d">Día 7 de 30</div>
                        </div>
                    </div>
                </div>

                <div className="c">
                    <div className="c-head"><div className="c-t">Plan vs Real</div><div className="c-a">Gestionar</div></div>
                    {!hasMonthPlan ? (
                        <div className="plan-mt">
                            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            <p>Aún no tienes un plan mensual.<br />Crea uno y toma el control.</p>
                            <button className="plan-btn" onClick={() => dispatchPopup("plan")}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Crear plan mensual
                            </button>
                        </div>
                    ) : (
                        <div className="plan-mt">
                            <div className="text-3xl font-bold text-[var(--ok)]">{format.percent.format(monthUsagePct)}%</div>
                            <p className="mt-2 text-[var(--tx2)] font-medium">del plan usado.</p>
                            <div className="mt-4"><button className="plan-btn" onClick={() => dispatchPopup("plan")}>Revisar presupuesto</button></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

import Link from "next/link";
import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";
import { ScheduleActions } from "@/components/transactions/ScheduleActions";
import { ModuleHero } from "@/components/ui/ModuleHero";
import {
    ArrowDownCircle,
    ArrowUpCircle,
} from "lucide-react";

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

function resolveNextCycleDay(days: number[], todayDay: number) {
    const uniqueDays = Array.from(
        new Set(
            days
                .map((day) => Math.round(day))
                .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31)
        )
    ).sort((a, b) => a - b);

    if (uniqueDays.length === 0) return null;

    for (const day of uniqueDays) {
        if (day >= todayDay) return day;
    }

    return uniqueDays[0];
}

function daysUntilDay(targetDay: number, todayDay: number, daysInMonth: number) {
    if (targetDay >= todayDay) return targetDay - todayDay;
    return daysInMonth - todayDay + targetDay;
}

function savingsPriorityLabel(priority: string) {
    if (priority === "emergency_fund") return "Fondo de emergencia";
    if (priority === "debt_payments") return "Bajar deudas";
    if (priority === "savings_goals") return "Acelerar metas";
    return priority;
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

/* ── Status metadata ── */

const STATUS_META = {
    confirmed: {
        label: "Confirmado",
        pillClass: "status-confirmed",
        cardClass: "border-positive-200 bg-positive-50/40",
    },
    due_today: {
        label: "Hoy",
        pillClass: "status-due-today",
        cardClass: "border-[#0d4c7a]/20 bg-[#0d4c7a]/5",
    },
    overdue: {
        label: "Vencido",
        pillClass: "status-overdue",
        cardClass: "border-[#117068]/20 bg-[#117068]/5",
    },
    upcoming: {
        label: "Programado",
        pillClass: "status-upcoming",
        cardClass: "border-brand-100 bg-brand-50/30",
    },
} as const;

export default async function DashboardPage() {
    const [kpiBundle, recentRaw] = await Promise.all([getDashboardKPIs(), getRecentTransactions()]);
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
    const todayDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Replaced startOfDay

    const personal = kpiBundle.personal;
    const cycle = kpiBundle.personalCycle;
    const savingsPlan = kpiBundle.personalSavingsPlan;
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
    const monthTimePct = (todayDay / daysInMonth) * 100;
    const expectedSpendToDate = hasMonthPlan ? (monthPlanTotal * monthTimePct) / 100 : 0;
    const paceDelta = monthActualTotal - expectedSpendToDate;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ═══════════ HERO ═══════════ */}
            <ModuleHero
                eyebrow={`Panel diario · ${format.dayMonth.format(today)}`}
                title="Tu dinero hoy"
                description="Saldo real en banco y efectivo. Debajo encontrarás tu agenda del mes y el resumen del ciclo."
                actions={
                    <>
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            + Registrar movimiento
                        </Link>
                        <Link href="/dashboard/transactions" className="btn-secondary text-sm no-underline">
                            Ver registro
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Hoy en números
                        </p>

                        <div className="mt-3 rounded-2xl border border-surface-200 bg-white/90 px-4 py-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-surface-500">
                                    <ArrowDownCircle size={14} className="text-positive-500" />
                                    Ingresos
                                </span>
                                <span className="font-semibold text-positive-600">{format.money.format(todayIncome)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5 text-surface-500">
                                    <ArrowUpCircle size={14} className="text-[#0a3b5e]" />
                                    Gastos
                                </span>
                                <span className="font-semibold text-surface-600">{format.money.format(todayExpense)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-4 border-t border-surface-200 pt-2">
                                <span className="text-surface-600 font-medium">Neto</span>
                                <span className={`font-bold ${todayNet >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                    {format.money.format(todayNet)}
                                </span>
                            </div>
                        </div>
                    </>
                }
            >
                <p className="mt-6 text-5xl font-semibold text-[#0f2233] md:text-6xl">
                    {format.moneyCompact.format(availableNow)}
                </p>
                <p className="mt-2 text-sm font-medium text-surface-600">
                    Dinero real disponible hoy en banco y efectivo.
                </p>
            </ModuleHero>

            {/* ═══════════ MAIN CONTENT ═══════════ */}
            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                {/* Agenda */}
                <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex-1">
                            <h3 className="text-base font-semibold text-[#0f2233]">Agenda de cobros y pagos</h3>
                            <p className="mt-1 text-sm text-surface-500">
                                Tareas pendientes del mes actual.
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-2.5 py-1 text-xs font-semibold text-surface-600">
                            <span className="flex items-center gap-1 text-[#0d4c7a]"><span className="h-1.5 w-1.5 rounded-full bg-[#0d4c7a]" /> {scheduleReview?.summary.needsAttention || 0} pendientes</span>
                            <span className="mx-1 text-surface-300">·</span>
                            <span className="flex items-center gap-1 text-[#117068]"><span className="h-1.5 w-1.5 rounded-full bg-[#117068]" /> {scheduleReview?.summary.overdue || 0} vencidos</span>
                        </div>
                    </div>

                    {reviewItems.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-8 text-center text-sm text-surface-500">
                            No hay eventos programados todavía.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-2.5">
                            {reviewItems.slice(0, 8).map((event) => {
                                const meta = STATUS_META[event.status];

                                return (
                                    <article key={event.id} className={`rounded-xl border px-4 py-3.5 transition-all duration-200 ${meta.cardClass}`}>
                                        {/* Top row: status + date + amount */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={meta.pillClass}>{meta.label}</span>
                                                    <span className="text-xs text-surface-400">
                                                        {format.dayMonthShort.format(new Date(event.dueDate))}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-sm font-semibold text-[#0f2233] truncate">{event.title}</p>
                                                <p className="text-xs text-surface-400 truncate">{event.subtitle}</p>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </article>

                {/* Plan vs Actual */}
                <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Plan vs real del mes</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Comparación disponible si hay un plan mensual cargado.
                    </p>

                    {!hasMonthPlan ? (
                        <div className="mt-4 rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                            Aún no hay plan para este mes.{" "}
                            <Link href="/dashboard/budget" className="font-semibold text-brand-600 no-underline hover:text-brand-500">
                                Crear plan mensual
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-4">
                            {/* Summary rows */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-surface-500">Plan del mes</span>
                                    <span className="font-semibold text-[#0f2233]">{format.money.format(monthPlanTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-surface-500">Ejecutado</span>
                                    <span className="font-semibold text-[#0f2233]">{format.money.format(monthActualTotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-surface-500">Desvío</span>
                                    <span className={`font-semibold ${paceDelta <= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                        {paceDelta <= 0 ? "Dentro" : "Sobre"} · {format.money.format(Math.abs(paceDelta))}
                                    </span>
                                </div>
                            </div>

                            {/* Usage bar */}
                            <div>
                                <div className="flex justify-between text-xs text-surface-400 mb-1">
                                    <span>Uso del plan</span>
                                    <span>{format.percent.format(monthUsagePct)}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${monthUsagePct <= 100 ? "bg-brand-500" : "bg-negative-500"}`}
                                        style={{ width: `${Math.min(monthUsagePct, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Time bar */}
                            <div>
                                <div className="flex justify-between text-xs text-surface-400 mb-1">
                                    <span>Avance del mes</span>
                                    <span>Día {todayDay} de {daysInMonth}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
                                    <div className="h-full rounded-full bg-surface-300 transition-all duration-700" style={{ width: `${monthTimePct}%` }} />
                                </div>
                            </div>
                        </div>
                    )}
                </article>
            </section>

            {/* ═══════════ RECENT + GOALS ═══════════ */}
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                {/* Recent transactions */}
                <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Registro reciente</h3>
                    <p className="mt-1 text-sm text-surface-500">Últimos movimientos, día a día.</p>

                    {groupedDailyMovements.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-8 text-center text-sm text-surface-500">
                            No hay movimientos registrados todavía.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-2">
                            {groupedDailyMovements.slice(0, 7).map((day) => (
                                <article key={day.date} className="rounded-xl border border-surface-100 bg-surface-50/30 px-3.5 py-3 transition-colors hover:bg-surface-50">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#0f2233]">
                                            {format.dayMonthShort.format(new Date(day.date))}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="text-positive-600 font-medium">+{format.money.format(day.income)}</span>
                                            <span className="text-negative-600 font-medium">−{format.money.format(day.expense)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-2 space-y-1">
                                        {day.rows.slice(0, 3).map((mov) => (
                                            <div key={mov.id} className="flex items-center justify-between gap-3 text-xs">
                                                <span className="truncate text-surface-500">
                                                    {mov.description} · {mov.categoryName}
                                                </span>
                                                <span className={`shrink-0 font-semibold tabular-nums ${mov.amount >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                                    {mov.amount >= 0 ? "+" : "−"}{format.money.format(Math.abs(mov.amount))}
                                                </span>
                                            </div>
                                        ))}
                                        {day.rows.length > 3 && (
                                            <p className="text-[11px] text-surface-400">+{day.rows.length - 3} más</p>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    <div className="mt-4">
                        <Link href="/dashboard/transactions" className="text-xs font-semibold text-brand-600 no-underline hover:text-brand-500">
                            Ver registro completo →
                        </Link>
                    </div>
                </article>

                {/* Savings goals */}
                <article className="rounded-2xl border border-surface-200 bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Metas de ahorro</h3>
                    <p className="mt-1 text-sm text-surface-500">Avance mensual de tus objetivos.</p>

                    {topGoal ? (
                        <div className="mt-4 rounded-xl border border-positive-200 bg-positive-50/30 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-positive-600">Meta principal</p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-[#0f2233]">{topGoal.name}</p>
                                <p className="text-sm font-bold text-positive-600">{format.percent.format(topGoalProgress)}%</p>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-positive-100">
                                <div className="h-full rounded-full bg-positive-500 transition-all duration-700" style={{ width: `${topGoalProgress}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-surface-500">
                                {format.money.format(topGoal.current_amount)} de {format.money.format(topGoal.target_amount)}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                            Todavía no tienes metas activas.
                        </div>
                    )}

                    <div className="mt-3 space-y-2">
                        {savingsGoals.slice(0, 4).map((goal) => {
                            const progress = goalProgress(goal.current_amount, goal.target_amount);
                            return (
                                <article key={goal.id} className="rounded-xl border border-surface-100 bg-surface-50/30 px-3 py-2.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-medium text-[#0f2233]">{goal.name}</p>
                                        <span className="text-xs font-semibold text-brand-600">{format.percent.format(progress)}%</span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-100">
                                        <div className="h-full rounded-full bg-brand-400 transition-all duration-700" style={{ width: `${progress}%` }} />
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-4">
                        <Link href="/dashboard/settings#metas-ahorro" className="text-xs font-semibold text-brand-600 no-underline hover:text-brand-500">
                            Gestionar metas →
                        </Link>
                    </div>
                </article>
            </section>
        </div>
    );
}

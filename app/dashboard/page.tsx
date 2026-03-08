import Link from "next/link";
import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";
import { CashFlowChart } from "@/components/ui/CashFlowChart";
import { HoverMetricCard } from "@/components/ui/HoverMetricCard";
import { ModuleHero } from "@/components/ui/ModuleHero";
import { SpendingMixChart } from "@/components/ui/SpendingMixChart";
import { ScheduleActions } from "@/components/transactions/ScheduleActions";

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
    if (priority === "fixed_expenses") return "Blindar gastos fijos";
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

function reviewStatusMeta(status: "confirmed" | "due_today" | "upcoming" | "overdue") {
    if (status === "confirmed") {
        return {
            label: "✅ Confirmado",
            pillClass: "status-confirmed",
            cardClass: "border-positive-400/30 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_60%,#f0fdf4_100%)]",
            icon: "✅",
        };
    }

    if (status === "due_today") {
        return {
            label: "⚡ Hoy",
            pillClass: "status-due-today",
            cardClass: "border-warning-400/40 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_60%,#fef3c7_100%)] shadow-[0_0_0_1px_rgba(234,179,8,0.1)]",
            icon: "⚡",
        };
    }

    if (status === "overdue") {
        return {
            label: "🔴 Vencido",
            pillClass: "status-overdue",
            cardClass: "border-negative-400/40 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_60%,#fee2e2_100%)] shadow-[0_0_0_1px_rgba(239,68,68,0.1)]",
            icon: "🔴",
        };
    }

    return {
        label: "📅 Proximo",
        pillClass: "status-upcoming",
        cardClass: "border-brand-200/50 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_60%,#dbeafe_100%)]",
        icon: "📅",
    };
}

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

                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Tendencia de caja</h3>
                    <p className="mt-1 text-sm text-surface-500">Ingresos y gastos de los ultimos meses.</p>
                    <div className="mt-4">
                        <CashFlowChart data={kpiBundle.monthlyTrend} currency={kpiBundle.currency} />
                    </div>
                </section>
            </div>
        );
    }

    /* ── Personal dashboard ── */

    const today = new Date();
    const todayDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const todayStart = startOfDay(today);

    const personal = kpiBundle.personal;
    const cycle = kpiBundle.personalCycle;
    const savingsPlan = kpiBundle.personalSavingsPlan;
    const savingsGoals = kpiBundle.savingsGoals || [];

    const availableNow = personal?.liquidCash || 0;
    const fixedExpenses = cycle?.fixedPlanned || 0;
    const variableExpenses = cycle?.variablePlanned || 0;
    const cardPaymentsTotal = (cycle?.fullCardPayments || 0) + (cycle?.revolvingMinimumPayments || 0);
    const aiSavings = cycle?.plannedSavings || savingsPlan?.monthlySavingsPool || 0;

    const distributionRows = [
        { label: "Gastos fijos", value: fixedExpenses, color: "#0d4c7a" },
        { label: "Gastos variables", value: variableExpenses, color: "#117068" },
        { label: "Pagos de tarjeta", value: cardPaymentsTotal, color: "#e05252" },
        { label: "Ahorro IA", value: aiSavings, color: "#f59e0b" },
    ];
    const cycleTotal = distributionRows.reduce((sum, row) => sum + row.value, 0);

    const nextIncomeDay = resolveNextCycleDay(
        cycle
            ? [...cycle.incomePaymentDays, ...cycle.partnerIncomePaymentDays]
            : [],
        todayDay
    );
    const nextCardDay = resolveNextCycleDay(
        cycle ? cycle.cardSchedules.map((card) => card.paymentDay) : [],
        todayDay
    );

    const nextIncomeDelta =
        nextIncomeDay == null ? null : daysUntilDay(nextIncomeDay, todayDay, daysInMonth);
    const nextCardDelta =
        nextCardDay == null ? null : daysUntilDay(nextCardDay, todayDay, daysInMonth);
    const nextSubscriptionDay = resolveNextCycleDay(
        cycle ? cycle.subscriptionSchedules.map((subscription) => subscription.billingDay) : [],
        todayDay
    );
    const nextSubscriptionDelta =
        nextSubscriptionDay == null ? null : daysUntilDay(nextSubscriptionDay, todayDay, daysInMonth);

    const topGoal = savingsGoals[0] || null;
    const topGoalProgress = topGoal ? goalProgress(topGoal.current_amount, topGoal.target_amount) : 0;

    const fixedRatio = cycleTotal > 0 ? (fixedExpenses / cycleTotal) * 100 : 0;
    const variableRatio = cycleTotal > 0 ? (variableExpenses / cycleTotal) * 100 : 0;
    const cardRatio = cycleTotal > 0 ? (cardPaymentsTotal / cycleTotal) * 100 : 0;
    const savingsRatio = cycleTotal > 0 ? (aiSavings / cycleTotal) * 100 : 0;

    const sortedCards = [...(cycle?.cardSchedules || [])].sort((a, b) => {
        if (a.paymentDay === b.paymentDay) return b.expectedPayment - a.expectedPayment;
        return a.paymentDay - b.paymentDay;
    });

    const fixedCompositionDetails = (cycle?.fixedBreakdown || []).map((item) => ({
        label: item.name,
        value: format.money.format(item.amount),
    }));
    const variableCompositionDetails = (cycle?.variableBreakdown || []).map((item) => ({
        label: item.name,
        value: format.money.format(item.amount),
    }));

    const fixedHoverDetails = [
        ...(fixedCompositionDetails.length > 0
            ? fixedCompositionDetails
            : [{ label: "Sin categorias fijas", value: "-" }]),
        { label: "Total planificado", value: format.money.format(fixedExpenses) },
        { label: "Peso en el ciclo", value: `${format.percent.format(fixedRatio)}%` },
    ];

    const variableHoverDetails = [
        ...(variableCompositionDetails.length > 0
            ? variableCompositionDetails
            : [{ label: "Sin categorias variables", value: "-" }]),
        { label: "Total planificado", value: format.money.format(variableExpenses) },
        { label: "Peso en el ciclo", value: `${format.percent.format(variableRatio)}%` },
    ];

    const cardHoverDetails = [
        ...sortedCards.slice(0, 4).map((card) => ({
            label: `${card.name} · dia ${card.paymentDay}`,
            value: format.money.format(card.expectedPayment),
        })),
        {
            label: "Peso en el ciclo",
            value: `${format.percent.format(cardRatio)}%`,
        },
    ];

    const prioritiesLabel = savingsPlan?.savingsPriorities.length
        ? savingsPlan.savingsPriorities
            .map((priority) => savingsPriorityLabel(priority).replace(/^./, (char) => char.toLowerCase()))
            .join(" · ")
        : "No hay prioridades configuradas";

    const scheduleReview = cycle?.scheduleReview || null;
    const reviewItems = scheduleReview?.items || [];

    const todayMovements = recentMovements.filter((movement) => {
        const movementDate = startOfDay(new Date(movement.date));
        return isSameDay(movementDate, todayStart);
    });
    const todayIncome = todayMovements
        .filter((movement) => movement.amount >= 0)
        .reduce((sum, movement) => sum + movement.amount, 0);
    const todayExpense = todayMovements
        .filter((movement) => movement.amount < 0)
        .reduce((sum, movement) => sum + Math.abs(movement.amount), 0);
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
            {/* ═══════════════ HERO — Saldo único ═══════════════ */}
            <ModuleHero
                eyebrow={`Panel diario · ${format.dayMonth.format(today)}`}
                title="Tu dinero hoy"
                description="Saldo real en banco y efectivo. Debajo verás tu agenda del mes y lo que necesita tu atención."
                actions={
                    <>
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            + Registrar movimiento
                        </Link>
                        <Link href="/dashboard/transactions" className="btn-secondary text-sm no-underline">
                            Ver registro por fecha
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        {/* ── Daily pulse ── */}
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Hoy en números
                        </p>

                        <div className="mt-3 rounded-2xl border border-[#d8e3f2] bg-white/90 px-4 py-3 text-sm shadow-[0_4px_12px_rgba(15,35,62,0.04)]">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">📥 Ingresos</span>
                                <span className="font-semibold text-positive-600">{format.money.format(todayIncome)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">📤 Gastos</span>
                                <span className="font-semibold text-negative-600">{format.money.format(todayExpense)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-surface-200 pt-2">
                                <span className="text-surface-600 font-medium">Neto</span>
                                <span className={`font-bold ${todayNet >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                    {format.money.format(todayNet)}
                                </span>
                            </div>
                        </div>

                        {/* ── Quick countdowns ── */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-positive-400/30 bg-positive-400/10 px-2.5 py-1 text-[11px] font-semibold text-positive-600">
                                💰 Ingreso {nextIncomeDay != null
                                    ? nextIncomeDelta === 0 ? "hoy" : `en ${nextIncomeDelta}d`
                                    : "sin fecha"}
                            </span>
                            <span className="rounded-full border border-negative-400/30 bg-negative-400/10 px-2.5 py-1 text-[11px] font-semibold text-negative-600">
                                💳 Tarjeta {nextCardDay != null
                                    ? nextCardDelta === 0 ? "hoy" : `en ${nextCardDelta}d`
                                    : "sin fecha"}
                            </span>
                            <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                                🔄 Suscripción {nextSubscriptionDay != null
                                    ? nextSubscriptionDelta === 0 ? "hoy" : `en ${nextSubscriptionDelta}d`
                                    : "sin fecha"}
                            </span>
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

                {topGoal ? (
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d8e8c8] bg-white/80 px-3 py-1 text-xs font-medium text-[#46631f]">
                        <span>🎯 Meta activa: {topGoal.name}</span>
                        <span>·</span>
                        <span>{format.percent.format(topGoalProgress)}%</span>
                    </div>
                ) : null}
            </ModuleHero>

            {/* ═══════════════ KPI STRIP — 4 cards with distinct colors ═══════════════ */}
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="kpi-strip-card border-warning-400/30 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_60%,#fef3c7_100%)]">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-warning-600">Pendientes hoy</p>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-[#92400e]">{scheduleReview?.summary.needsAttention || 0}</p>
                    <p className="mt-1 text-xs text-warning-600/70">Eventos que necesitan tu confirmación.</p>
                </article>
                <article className="kpi-strip-card border-negative-400/30 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_60%,#fee2e2_100%)]">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔴</span>
                        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-negative-600">Vencidos</p>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-[#7f1d1d]">{scheduleReview?.summary.overdue || 0}</p>
                    <p className="mt-1 text-xs text-negative-600/70">Sin movimiento después de la fecha esperada.</p>
                </article>
                <article className="kpi-strip-card border-positive-400/30 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_60%,#dcfce7_100%)]">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">✅</span>
                        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-positive-600">Confirmados</p>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-[#14532d]">{scheduleReview?.summary.confirmed || 0}</p>
                    <p className="mt-1 text-xs text-positive-600/70">Detectados automáticamente con tus movimientos.</p>
                </article>
                <article className="kpi-strip-card border-brand-200/50 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_60%,#dbeafe_100%)]">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-brand-600">Próximos</p>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-[#1e3a5f]">{scheduleReview?.summary.upcoming || 0}</p>
                    <p className="mt-1 text-xs text-brand-600/70">Programados para los próximos días.</p>
                </article>
            </section>

            {/* ═══════════════ AGENDA + PLAN ═══════════════ */}
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                {/* ── Agenda automática ── */}
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Agenda del ciclo</h3>
                            <p className="text-sm text-surface-500">
                                Depósitos y pagos del mes. Si ya están en tus movimientos, se confirman solos.
                            </p>
                        </div>
                    </div>

                    {reviewItems.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-8 text-center text-sm text-surface-500">
                            No hay eventos de fecha definidos todavia.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {reviewItems.slice(0, 10).map((event) => {
                                const meta = reviewStatusMeta(event.status);

                                return (
                                    <article key={event.id} className={`rounded-2xl border px-4 py-4 transition-all duration-300 ${meta.cardClass}`}>
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={meta.pillClass}>
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-xs font-medium text-surface-500">
                                                        {format.dayMonthShort.format(new Date(event.dueDate))}
                                                    </span>
                                                    {event.nextDate ? (
                                                        <span className="rounded-full border border-negative-400/30 bg-negative-400/10 px-2 py-0.5 text-[10px] font-semibold text-negative-600">
                                                            → {format.dayMonthShort.format(new Date(event.nextDate))}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-2 text-base font-semibold text-[#0f2233]">{event.title}</p>
                                                <p className="mt-0.5 text-sm text-surface-500">{event.subtitle}</p>
                                            </div>

                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${event.kind === "income" ? "text-positive-600" : "text-negative-600"}`}>
                                                    {event.kind === "income" ? "+" : "-"}
                                                    {format.money.format(event.amount)}
                                                </p>
                                                {event.matchedDate ? (
                                                    <p className="mt-1 text-xs font-medium text-positive-600/80">
                                                        ✓ {format.dayMonthShort.format(new Date(event.matchedDate))}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="mt-3 rounded-xl border border-surface-200/80 bg-surface-50/60 px-3 py-2 text-sm text-surface-600">
                                            {event.note}
                                        </div>

                                        <div className="mt-3">
                                            <ScheduleActions
                                                eventId={event.id}
                                                status={event.status}
                                                ctaHref={event.ctaHref}
                                                ctaLabel={event.ctaLabel}
                                                kind={event.kind}
                                            />
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </article>

                {/* ── Actual vs plan ── */}
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Actual vs plan del mes</h3>
                            <p className="text-sm text-surface-500">
                                Comparamos solo si el plan del mes fue cargado.
                            </p>
                        </div>
                    </div>

                    {!hasMonthPlan ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                            Aun no hay plan para este mes. La comparacion arrancara cuando registres topes mensuales en
                            <Link href="/dashboard/budget" className="ml-1 font-semibold text-brand-600 no-underline hover:text-brand-500">
                                Plan mensual
                            </Link>.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-surface-200 bg-surface-50/50 px-3 py-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-500">Plan del mes</span>
                                    <span className="font-semibold text-[#0f2233]">{format.money.format(monthPlanTotal)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-surface-500">Ejecutado a hoy</span>
                                    <span className="font-semibold text-[#0f2233]">{format.money.format(monthActualTotal)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-surface-500">Ritmo esperado a hoy</span>
                                    <span className="font-semibold text-[#0f2233]">{format.money.format(expectedSpendToDate)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-surface-500">Desvio de ritmo</span>
                                    <span className={`font-semibold ${paceDelta <= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                        {paceDelta <= 0 ? "✅ Dentro" : "⚠️ Sobre"} · {format.money.format(Math.abs(paceDelta))}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-surface-500">Uso del plan</p>
                                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-surface-200">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${monthUsagePct <= 100 ? "bg-[linear-gradient(90deg,#117068,#239A66)]" : "bg-negative-500"}`}
                                        style={{ width: `${Math.min(monthUsagePct, 100)}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-surface-500">{format.percent.format(monthUsagePct)}% ejecutado</p>
                            </div>

                            <div>
                                <p className="text-xs text-surface-500">Avance de dias del mes</p>
                                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-surface-200">
                                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#2F6DB1)] transition-all duration-700" style={{ width: `${monthTimePct}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-surface-500">Dia {todayDay} de {daysInMonth}</p>
                            </div>
                        </div>
                    )}
                </article>
            </section>

            {/* ═══════════════ CYCLE PROJECTIONS ═══════════════ */}
            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🧮</span>
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Montos del ciclo</h3>
                            <p className="text-sm text-surface-500">
                                Proyección mensual — no es dinero disponible hoy.
                            </p>
                        </div>
                    </div>
                    <span className="rounded-full border border-warning-400/30 bg-warning-400/10 px-3 py-1 text-xs font-semibold text-warning-600">
                        📐 Proyección
                    </span>
                </div>

                {/* ── Stacked distribution bar ── */}
                {cycleTotal > 0 && (
                    <div className="mt-4">
                        <div className="flex h-4 w-full overflow-hidden rounded-full">
                            <div className="h-full bg-[#0d4c7a] transition-all duration-700" style={{ width: `${fixedRatio}%` }} title={`Fijos ${format.percent.format(fixedRatio)}%`} />
                            <div className="h-full bg-[#117068] transition-all duration-700" style={{ width: `${variableRatio}%` }} title={`Variables ${format.percent.format(variableRatio)}%`} />
                            <div className="h-full bg-[#e05252] transition-all duration-700" style={{ width: `${cardRatio}%` }} title={`Tarjetas ${format.percent.format(cardRatio)}%`} />
                            <div className="h-full bg-[#f59e0b] transition-all duration-700" style={{ width: `${savingsRatio}%` }} title={`Ahorro ${format.percent.format(savingsRatio)}%`} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium">
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#0d4c7a]" />Fijos {format.percent.format(fixedRatio)}%</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#117068]" />Variables {format.percent.format(variableRatio)}%</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#e05252]" />Tarjetas {format.percent.format(cardRatio)}%</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />Ahorro {format.percent.format(savingsRatio)}%</span>
                        </div>
                    </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <HoverMetricCard
                        label="Gastos fijos"
                        value={format.moneyCompact.format(fixedExpenses)}
                        details={fixedHoverDetails}
                        footer="Composicion de categorias fijas que forman el total mensual."
                        tooltipSide="bottom"
                    />
                    <HoverMetricCard
                        label="Gastos variables"
                        value={format.moneyCompact.format(variableExpenses)}
                        details={variableHoverDetails}
                        footer="Composicion de categorias variables que forman el total mensual."
                        tooltipSide="bottom"
                    />
                    <HoverMetricCard
                        label="Pagos de tarjeta"
                        value={format.moneyCompact.format(cardPaymentsTotal)}
                        valueClassName="text-negative-600"
                        details={cardHoverDetails}
                        footer="Detalle segun tarjetas activas y estrategia configurada por tarjeta."
                        tooltipSide="bottom"
                    />
                    <HoverMetricCard
                        label="Ahorro IA"
                        value={format.moneyCompact.format(aiSavings)}
                        valueClassName="text-[#117068]"
                        details={[
                            { label: "Pool mensual sugerido", value: format.money.format(aiSavings) },
                            {
                                label: "Porcentaje sugerido",
                                value: `${format.percent.format(savingsPlan?.savingsPct || 0)}%`,
                            },
                            { label: "Peso en el ciclo", value: `${format.percent.format(savingsRatio)}%` },
                        ]}
                        footer={prioritiesLabel}
                        tooltipSide="bottom"
                    />
                </div>

                <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50/50 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-surface-500">Compromiso total del ciclo</span>
                        <span className="font-semibold text-[#0f2233]">{format.money.format(cycleTotal)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-surface-500">Saldo libre proyectado</span>
                        <span className="font-bold text-positive-600">{format.money.format(cycle?.projectedFreeCash || 0)}</span>
                    </div>
                </div>
            </section>

            {/* ═══════════════ RECENT TRANSACTIONS + SAVINGS GOALS ═══════════════ */}
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📒</span>
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Registro reciente</h3>
                            <p className="text-sm text-surface-500">
                                Ultimos movimientos registrados, dia a dia.
                            </p>
                        </div>
                    </div>

                    {groupedDailyMovements.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-8 text-center text-sm text-surface-500">
                            No hay movimientos registrados todavia.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {groupedDailyMovements.slice(0, 7).map((day) => (
                                <article key={day.date} className="rounded-xl border border-surface-200 bg-surface-50/30 px-3.5 py-3 transition-colors hover:bg-surface-50">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#0f2233]">
                                            {format.dayMonthShort.format(new Date(day.date))}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="text-positive-600 font-medium">+{format.money.format(day.income)}</span>
                                            <span className="text-negative-600 font-medium">-{format.money.format(day.expense)}</span>
                                            <span className={`font-bold ${day.net >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                                Neto {format.money.format(day.net)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-2 space-y-1.5">
                                        {day.rows.slice(0, 4).map((movement) => (
                                            <div key={movement.id} className="flex items-center justify-between gap-3 text-xs">
                                                <span className="truncate text-surface-600">
                                                    {movement.description} · {movement.categoryName}
                                                </span>
                                                <span className={`shrink-0 font-semibold ${movement.amount >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                                    {movement.amount >= 0 ? "+" : "-"}
                                                    {format.money.format(Math.abs(movement.amount))}
                                                </span>
                                            </div>
                                        ))}
                                        {day.rows.length > 4 ? (
                                            <p className="text-[11px] text-surface-500">+{day.rows.length - 4} movimientos mas en este dia</p>
                                        ) : null}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    <div className="mt-4">
                        <Link href="/dashboard/transactions" className="text-xs font-semibold text-brand-600 no-underline hover:text-brand-500">
                            Abrir registro completo por fecha →
                        </Link>
                    </div>
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎯</span>
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Metas de ahorro</h3>
                            <p className="text-sm text-surface-500">Seguimiento de objetivo principal y avance mensual.</p>
                        </div>
                    </div>

                    {topGoal ? (
                        <div className="mt-4 rounded-xl border border-positive-400/30 bg-positive-400/5 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-positive-600">🏆 Meta principal</p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <p className="truncate text-base font-semibold text-[#0f2233]">{topGoal.name}</p>
                                <p className="text-sm font-bold text-positive-600">{format.percent.format(topGoalProgress)}%</p>
                            </div>
                            <div className="mt-2 h-3 w-full rounded-full bg-positive-400/15">
                                <div className="h-full rounded-full bg-[linear-gradient(90deg,#117068,#239A66)] transition-all duration-700" style={{ width: `${topGoalProgress}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-surface-600">
                                {format.money.format(topGoal.current_amount)} de {format.money.format(topGoal.target_amount)}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                            Todavia no tienes metas activas.
                        </div>
                    )}

                    <div className="mt-4 space-y-2">
                        {savingsGoals.slice(0, 4).map((goal) => {
                            const progress = goalProgress(goal.current_amount, goal.target_amount);
                            return (
                                <article key={goal.id} className="rounded-xl border border-surface-200 bg-surface-50/30 px-3 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-semibold text-[#0f2233]">{goal.name}</p>
                                        <span className="text-xs font-bold text-brand-600">{format.percent.format(progress)}%</span>
                                    </div>
                                    <div className="mt-2 h-2.5 w-full rounded-full bg-surface-200">
                                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#117068)] transition-all duration-700" style={{ width: `${progress}%` }} />
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-4">
                        <Link href="/dashboard/settings#metas-ahorro" className="text-xs font-semibold text-brand-600 no-underline hover:text-brand-500">
                            Gestionar metas y prioridades →
                        </Link>
                    </div>
                </article>
            </section>

            {/* ═══════════════ CHARTS ═══════════════ */}
            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📈</span>
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Tendencia de caja</h3>
                            <p className="text-sm text-surface-500">Vista historica de ingresos y gastos mensuales.</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <CashFlowChart data={kpiBundle.monthlyTrend} currency={kpiBundle.currency} />
                    </div>
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🍩</span>
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Distribución del ciclo</h3>
                            <p className="text-sm text-surface-500">Como se reparte la proyeccion mensual por bloque.</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <SpendingMixChart
                            data={distributionRows}
                            total={cycleTotal}
                            currency={kpiBundle.currency}
                            locale={kpiBundle.locale}
                        />
                    </div>
                </article>
            </section>
        </div>
    );
}

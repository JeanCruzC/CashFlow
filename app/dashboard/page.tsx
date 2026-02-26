import Link from "next/link";
import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";
import { CashFlowChart } from "@/components/ui/CashFlowChart";
import { HoverMetricCard } from "@/components/ui/HoverMetricCard";
import { ModuleHero } from "@/components/ui/ModuleHero";
import { SpendingMixChart } from "@/components/ui/SpendingMixChart";

type Locale = "es" | "en";

interface TimelineEvent {
    id: string;
    date: Date;
    title: string;
    subtitle: string;
    amount: number | null;
    tone: "income" | "expense";
}

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

function cardStrategyLabel(strategy: "full" | "minimum" | "fixed") {
    if (strategy === "full") return "Pago total";
    if (strategy === "minimum") return "Pago minimo";
    return "Pago fijo";
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

function clampDay(day: number) {
    return Math.max(1, Math.min(31, Math.round(day)));
}

function nextOccurrenceDate(day: number, today: Date) {
    const safeDay = clampDay(day);
    const baseToday = startOfDay(today);
    const year = baseToday.getFullYear();
    const month = baseToday.getMonth();

    const currentMonthDays = new Date(year, month + 1, 0).getDate();
    let candidate = new Date(year, month, Math.min(safeDay, currentMonthDays));
    candidate = startOfDay(candidate);

    if (candidate < baseToday) {
        const nextMonth = month + 1;
        const nextYear = nextMonth > 11 ? year + 1 : year;
        const normalizedMonth = nextMonth > 11 ? 0 : nextMonth;
        const daysInNextMonth = new Date(nextYear, normalizedMonth + 1, 0).getDate();
        candidate = new Date(nextYear, normalizedMonth, Math.min(safeDay, daysInNextMonth));
        candidate = startOfDay(candidate);
    }

    return candidate;
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

function buildTimelineEvents({
    today,
    cycle,
    financialProfile,
}: {
    today: Date;
    cycle: NonNullable<Awaited<ReturnType<typeof getDashboardKPIs>>["personalCycle"]>;
    financialProfile: Awaited<ReturnType<typeof getDashboardKPIs>>["financialProfile"];
}) {
    const events: TimelineEvent[] = [];

    const pushEvent = (event: Omit<TimelineEvent, "id">) => {
        events.push({
            ...event,
            id: `${event.title}-${event.date.toISOString()}-${events.length}`,
        });
    };

    const mainFrequency = financialProfile?.salary_frequency || "monthly";
    if (mainFrequency === "biweekly") {
        const dayOne =
            Number(financialProfile?.salary_payment_day_2 || 0) || cycle.incomePaymentDays[0] || 15;
        const dayTwo =
            Number(financialProfile?.salary_payment_day_1 || 0) || cycle.incomePaymentDays[1] || 30;
        const amountOne = Number(financialProfile?.first_fortnight_amount || 0) || null;
        const amountTwo = Number(financialProfile?.second_fortnight_amount || 0) || null;

        pushEvent({
            date: nextOccurrenceDate(dayOne, today),
            title: "Deposito de sueldo",
            subtitle: "Titular · 1ra quincena",
            amount: amountOne,
            tone: "income",
        });
        pushEvent({
            date: nextOccurrenceDate(dayTwo, today),
            title: "Deposito de sueldo",
            subtitle: "Titular · 2da quincena",
            amount: amountTwo,
            tone: "income",
        });
    } else if (cycle.incomePaymentDays[0]) {
        pushEvent({
            date: nextOccurrenceDate(cycle.incomePaymentDays[0], today),
            title: "Deposito de sueldo",
            subtitle: "Titular",
            amount: Number(financialProfile?.monthly_income_net || 0) || null,
            tone: "income",
        });
    }

    const hasPartnerIncome = Number(financialProfile?.partner_contribution || 0) > 0;
    if (hasPartnerIncome) {
        const partnerFrequency = financialProfile?.partner_salary_frequency || "monthly";
        if (partnerFrequency === "biweekly") {
            const dayOne =
                Number(financialProfile?.partner_salary_payment_day_2 || 0) || cycle.partnerIncomePaymentDays[0] || 15;
            const dayTwo =
                Number(financialProfile?.partner_salary_payment_day_1 || 0) || cycle.partnerIncomePaymentDays[1] || 30;
            const amountOne = Number(financialProfile?.partner_first_fortnight_amount || 0) || null;
            const amountTwo = Number(financialProfile?.partner_second_fortnight_amount || 0) || null;

            pushEvent({
                date: nextOccurrenceDate(dayOne, today),
                title: "Deposito compartido",
                subtitle: "Pareja/coparticipe · 1ra quincena",
                amount: amountOne,
                tone: "income",
            });
            pushEvent({
                date: nextOccurrenceDate(dayTwo, today),
                title: "Deposito compartido",
                subtitle: "Pareja/coparticipe · 2da quincena",
                amount: amountTwo,
                tone: "income",
            });
        } else if (cycle.partnerIncomePaymentDays[0]) {
            pushEvent({
                date: nextOccurrenceDate(cycle.partnerIncomePaymentDays[0], today),
                title: "Deposito compartido",
                subtitle: "Pareja/coparticipe",
                amount: Number(financialProfile?.partner_contribution || 0) || null,
                tone: "income",
            });
        }
    }

    for (const card of cycle.cardSchedules) {
        pushEvent({
            date: nextOccurrenceDate(card.paymentDay, today),
            title: `Pago tarjeta ${card.name}`,
            subtitle: cardStrategyLabel(card.strategy),
            amount: card.expectedPayment,
            tone: "expense",
        });
    }

    for (const subscription of cycle.subscriptionSchedules) {
        pushEvent({
            date: nextOccurrenceDate(subscription.billingDay, today),
            title: `Pago suscripcion ${subscription.name}`,
            subtitle: "Facturacion recurrente",
            amount: subscription.monthlyCost,
            tone: "expense",
        });
    }

    return events
        .sort((a, b) => {
            if (a.date.getTime() === b.date.getTime()) {
                if (a.tone === b.tone) return a.title.localeCompare(b.title);
                return a.tone === "income" ? -1 : 1;
            }
            return a.date.getTime() - b.date.getTime();
        })
        .slice(0, 12);
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

    const today = new Date();
    const todayDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const todayStart = startOfDay(today);

    const personal = kpiBundle.personal;
    const cycle = kpiBundle.personalCycle;
    const savingsPlan = kpiBundle.personalSavingsPlan;
    const financialProfile = kpiBundle.financialProfile;
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

    const timelineEvents = cycle
        ? buildTimelineEvents({
            today,
            cycle,
            financialProfile,
        })
        : [];

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
            <ModuleHero
                eyebrow={`Panel diario · ${format.dayMonth.format(today)}`}
                title="Lo que tienes hoy"
                description="Primero ves tu dinero real de hoy. Despues revisas agenda por fecha, plan del mes y detalle de cada monto calculado."
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
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Resumen de hoy
                        </p>

                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">Movimientos hoy</span>
                                <span className="font-semibold text-[#0f2233]">{todayMovements.length}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Ingresos hoy</span>
                                <span className="font-semibold text-positive-600">{format.money.format(todayIncome)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Gastos hoy</span>
                                <span className="font-semibold text-negative-600">{format.money.format(todayExpense)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Neto de hoy</span>
                                <span className={`font-semibold ${todayNet >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                    {format.money.format(todayNet)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#c7dbf2] bg-white/80 px-3 py-1 text-xs font-medium text-[#0d4c7a]">
                                {nextIncomeDay != null
                                    ? `Proximo ingreso: dia ${nextIncomeDay}${
                                        nextIncomeDelta != null
                                            ? nextIncomeDelta === 0
                                                ? " · hoy"
                                                : ` · en ${nextIncomeDelta} dias`
                                            : ""
                                    }`
                                    : "Proximo ingreso: sin fecha"}
                            </span>
                            <span className="rounded-full border border-[#f2d4cc] bg-white/80 px-3 py-1 text-xs font-medium text-[#a54432]">
                                {nextCardDay != null
                                    ? `Proximo pago tarjeta: dia ${nextCardDay}${
                                        nextCardDelta != null
                                            ? nextCardDelta === 0
                                                ? " · hoy"
                                                : ` · en ${nextCardDelta} dias`
                                            : ""
                                    }`
                                    : "Proximo pago tarjeta: sin fecha"}
                            </span>
                            <span className="rounded-full border border-[#d9e2f0] bg-white/80 px-3 py-1 text-xs font-medium text-[#0d4c7a]">
                                {nextSubscriptionDay != null
                                    ? `Proxima suscripcion: dia ${nextSubscriptionDay}${
                                        nextSubscriptionDelta != null
                                            ? nextSubscriptionDelta === 0
                                                ? " · hoy"
                                                : ` · en ${nextSubscriptionDelta} dias`
                                            : ""
                                    }`
                                    : "Proxima suscripcion: sin fecha"}
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
                        <span>Meta activa: {topGoal.name}</span>
                        <span>·</span>
                        <span>{format.percent.format(topGoalProgress)}%</span>
                    </div>
                ) : null}
            </ModuleHero>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Agenda por fecha</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Depositos y pagos programados para los proximos dias.
                    </p>

                    {timelineEvents.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-8 text-center text-sm text-surface-500">
                            No hay eventos de fecha definidos todavia.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-2.5">
                            {timelineEvents.map((event) => (
                                <article key={event.id} className="rounded-xl border border-[#e6edf7] bg-[#fbfdff] px-3.5 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-[#0f2233]">{event.title}</p>
                                            <p className="mt-0.5 text-xs text-surface-500">{event.subtitle}</p>
                                        </div>
                                        <p className="text-xs font-semibold text-surface-500">
                                            {format.dayMonthShort.format(event.date)}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-sm">
                                        <span className="text-surface-500">Monto</span>
                                        <span className={`font-semibold ${event.tone === "income" ? "text-positive-600" : "text-negative-600"}`}>
                                            {event.amount == null
                                                ? "No definido"
                                                : `${event.tone === "income" ? "+" : "-"}${format.money.format(event.amount)}`}
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Actual vs plan del mes</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Comparamos solo si el plan del mes fue cargado.
                    </p>

                    {!hasMonthPlan ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                            Aun no hay plan para este mes. La comparacion arrancara cuando registres topes mensuales en
                            <span className="font-semibold text-[#0d4c7a]"> Plan mensual</span>.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
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
                                        {paceDelta <= 0 ? "Dentro" : "Sobre"} · {format.money.format(Math.abs(paceDelta))}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-surface-500">Uso del plan</p>
                                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e4ecf7]">
                                    <div
                                        className={`h-full rounded-full ${monthUsagePct <= 100 ? "bg-[#117068]" : "bg-negative-500"}`}
                                        style={{ width: `${Math.min(monthUsagePct, 100)}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-surface-500">{format.percent.format(monthUsagePct)}% ejecutado</p>
                            </div>

                            <div>
                                <p className="text-xs text-surface-500">Avance de dias del mes</p>
                                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e4ecf7]">
                                    <div className="h-full rounded-full bg-[#0d4c7a]" style={{ width: `${monthTimePct}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-surface-500">Dia {todayDay} de {daysInMonth}</p>
                            </div>
                        </div>
                    )}
                </article>
            </section>

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h3 className="text-base font-semibold text-[#0f2233]">Montos calculados del ciclo</h3>
                        <p className="mt-1 text-sm text-surface-500">
                            Esta zona es proyeccion mensual, no dinero disponible hoy.
                        </p>
                    </div>
                    <span className="rounded-full border border-[#f2d4cc] bg-[#fff7f5] px-3 py-1 text-xs font-medium text-[#a54432]">
                        Proyeccion de ciclo
                    </span>
                </div>

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

                <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-surface-500">Compromiso total del ciclo</span>
                        <span className="font-semibold text-[#0f2233]">{format.money.format(cycleTotal)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-surface-500">Saldo libre proyectado</span>
                        <span className="font-semibold text-[#117068]">{format.money.format(cycle?.projectedFreeCash || 0)}</span>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Registro diario reciente</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Detalle dia a dia de los ultimos movimientos registrados.
                    </p>

                    {groupedDailyMovements.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-8 text-center text-sm text-surface-500">
                            No hay movimientos registrados todavia.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {groupedDailyMovements.slice(0, 7).map((day) => (
                                <article key={day.date} className="rounded-xl border border-[#e8eef7] bg-[#fbfdff] px-3.5 py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#0f2233]">
                                            {format.dayMonthShort.format(new Date(day.date))}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="text-positive-600">+ {format.money.format(day.income)}</span>
                                            <span className="text-negative-600">- {format.money.format(day.expense)}</span>
                                            <span className={`font-semibold ${day.net >= 0 ? "text-positive-600" : "text-negative-600"}`}>
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
                        <Link href="/dashboard/transactions" className="text-xs font-semibold text-[#0d4c7a] no-underline hover:text-[#117068]">
                            Abrir registro completo por fecha →
                        </Link>
                    </div>
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Meta activa</h3>
                    <p className="mt-1 text-sm text-surface-500">Seguimiento de objetivo principal y avance mensual.</p>

                    {topGoal ? (
                        <div className="mt-4 rounded-xl border border-[#cfe3d8] bg-[#f2faf6] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4d6f55]">Meta principal</p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <p className="truncate text-base font-semibold text-[#0f2233]">{topGoal.name}</p>
                                <p className="text-sm font-semibold text-[#117068]">{format.percent.format(topGoalProgress)}%</p>
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
                                <article key={goal.id} className="rounded-xl border border-[#e8eef7] bg-[#fbfdff] px-3 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-semibold text-[#0f2233]">{goal.name}</p>
                                        <span className="text-xs font-semibold text-[#0d4c7a]">{format.percent.format(progress)}%</span>
                                    </div>
                                    <div className="mt-2 h-2 w-full rounded-full bg-[#e8edf6]">
                                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#117068)]" style={{ width: `${progress}%` }} />
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-4">
                        <Link href="/dashboard/settings#metas-ahorro" className="text-xs font-semibold text-[#0d4c7a] no-underline hover:text-[#117068]">
                            Gestionar metas y prioridades →
                        </Link>
                    </div>
                </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Tendencia de caja</h3>
                    <p className="mt-1 text-sm text-surface-500">Vista historica de ingresos y gastos mensuales.</p>
                    <div className="mt-4">
                        <CashFlowChart data={kpiBundle.monthlyTrend} currency={kpiBundle.currency} />
                    </div>
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Distribucion del ciclo</h3>
                    <p className="mt-1 text-sm text-surface-500">Como se reparte la proyeccion mensual por bloque.</p>
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

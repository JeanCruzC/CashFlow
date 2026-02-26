import Link from "next/link";
import { getDashboardKPIs } from "@/app/actions/dashboard";
import { CashFlowChart } from "@/components/ui/CashFlowChart";
import { HoverMetricCard } from "@/components/ui/HoverMetricCard";
import { ModuleHero } from "@/components/ui/ModuleHero";
import { SpendingMixChart } from "@/components/ui/SpendingMixChart";

type Locale = "es" | "en";

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

export default async function DashboardPage() {
    const kpiBundle = await getDashboardKPIs();
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

    const sortedCards = [...(cycle?.cardSchedules || [])].sort((a, b) => {
        if (a.paymentDay === b.paymentDay) return b.expectedPayment - a.expectedPayment;
        return a.paymentDay - b.paymentDay;
    });
    const totalScheduledCardPayments = sortedCards.reduce(
        (sum, card) => sum + card.expectedPayment,
        0
    );

    const topGoal = savingsGoals[0] || null;
    const topGoalProgress = topGoal
        ? goalProgress(topGoal.current_amount, topGoal.target_amount)
        : 0;

    const fixedRatio = cycleTotal > 0 ? (fixedExpenses / cycleTotal) * 100 : 0;
    const variableRatio = cycleTotal > 0 ? (variableExpenses / cycleTotal) * 100 : 0;
    const cardRatio = cycleTotal > 0 ? (cardPaymentsTotal / cycleTotal) * 100 : 0;
    const savingsRatio = cycleTotal > 0 ? (aiSavings / cycleTotal) * 100 : 0;

    const cardFull = cycle?.fullCardPayments || 0;
    const cardMinFixed = cycle?.revolvingMinimumPayments || 0;
    const prioritiesLabel = savingsPlan?.savingsPriorities.length
        ? savingsPlan.savingsPriorities
            .map((priority) => savingsPriorityLabel(priority).replace(/^./, (char) => char.toLowerCase()))
            .join(" · ")
        : "No hay prioridades configuradas";

    const incomeBadgeLabel = nextIncomeDay
        ? `Proximo ingreso: dia ${nextIncomeDay}${
            nextIncomeDelta != null
                ? nextIncomeDelta === 0
                    ? " · hoy"
                    : ` · en ${nextIncomeDelta} dias`
                : ""
        }`
        : "Proximo ingreso: sin fecha";

    const cardBadgeLabel = nextCardDay
        ? `Proximo pago tarjeta: dia ${nextCardDay}${
            nextCardDelta != null
                ? nextCardDelta === 0
                    ? " · hoy"
                    : ` · en ${nextCardDelta} dias`
                : ""
        }`
        : "Proximo pago tarjeta: sin fecha";

    return (
        <div className="space-y-6 animate-fade-in">
            <ModuleHero
                eyebrow={`Panorama simple · ${format.dayMonth.format(today)}`}
                title="Asi estas hoy"
                description="Mostramos lo esencial: disponible actual, gastos clave, tarjetas y metas."
                actions={
                    <>
                        <Link
                            href="/dashboard/transactions/new"
                            className="btn-primary text-sm no-underline hover:text-white"
                        >
                            + Nuevo movimiento
                        </Link>
                        <Link
                            href="/dashboard/transactions"
                            className="btn-secondary text-sm no-underline"
                        >
                            Ver movimientos
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Tu ciclo mensual
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <HoverMetricCard
                                label="Gastos fijos"
                                value={format.moneyCompact.format(fixedExpenses)}
                                details={[
                                    {
                                        label: "Total planificado",
                                        value: format.money.format(fixedExpenses),
                                    },
                                    {
                                        label: "Peso en el ciclo",
                                        value: `${format.percent.format(fixedRatio)}%`,
                                    },
                                ]}
                                footer="Incluye rubros recurrentes de vivienda, servicios y compromisos no movibles."
                            />
                            <HoverMetricCard
                                label="Gastos variables"
                                value={format.moneyCompact.format(variableExpenses)}
                                details={[
                                    {
                                        label: "Total planificado",
                                        value: format.money.format(variableExpenses),
                                    },
                                    {
                                        label: "Peso en el ciclo",
                                        value: `${format.percent.format(variableRatio)}%`,
                                    },
                                ]}
                                footer="Incluye consumo flexible del mes: compras, ocio, traslados y ajustes diarios."
                            />
                            <HoverMetricCard
                                label="Pagos de tarjeta"
                                value={format.moneyCompact.format(cardPaymentsTotal)}
                                valueClassName="text-negative-600"
                                details={[
                                    {
                                        label: "Pago total",
                                        value: format.money.format(cardFull),
                                    },
                                    {
                                        label: "Pago minimo/fijo",
                                        value: format.money.format(cardMinFixed),
                                    },
                                    {
                                        label: "Tarjetas activas",
                                        value: String(sortedCards.length),
                                    },
                                    {
                                        label: "Peso en el ciclo",
                                        value: `${format.percent.format(cardRatio)}%`,
                                    },
                                ]}
                                footer="Detalle calculado segun dia de pago y estrategia configurada por tarjeta."
                            />
                            <HoverMetricCard
                                label="Ahorro IA"
                                value={format.moneyCompact.format(aiSavings)}
                                valueClassName="text-[#117068]"
                                details={[
                                    {
                                        label: "Pool mensual sugerido",
                                        value: format.money.format(aiSavings),
                                    },
                                    {
                                        label: "Porcentaje de ahorro",
                                        value: `${format.percent.format(savingsPlan?.savingsPct || 0)}%`,
                                    },
                                    {
                                        label: "Peso en el ciclo",
                                        value: `${format.percent.format(savingsRatio)}%`,
                                    },
                                ]}
                                footer={prioritiesLabel}
                            />
                        </div>

                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">Compromiso total</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {format.money.format(cycleTotal)}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Saldo libre proyectado</span>
                                <span className="font-semibold text-[#117068]">
                                    {format.money.format(cycle?.projectedFreeCash || 0)}
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
                    Dinero actual en banco y efectivo.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#c7dbf2] bg-white/80 px-3 py-1 text-xs font-medium text-[#0d4c7a]">
                        {incomeBadgeLabel}
                    </span>
                    <span className="rounded-full border border-[#f2d4cc] bg-white/80 px-3 py-1 text-xs font-medium text-[#a54432]">
                        {cardBadgeLabel}
                    </span>
                    {topGoal ? (
                        <span className="rounded-full border border-[#d8e8c8] bg-white/80 px-3 py-1 text-xs font-medium text-[#46631f]">
                            Meta activa: {topGoal.name}
                        </span>
                    ) : null}
                </div>
            </ModuleHero>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Tendencia de caja</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Evolucion de ingresos y gastos recientes para detectar ritmo de consumo.
                    </p>
                    <div className="mt-4">
                        <CashFlowChart data={kpiBundle.monthlyTrend} currency={kpiBundle.currency} />
                    </div>
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Distribucion del ciclo</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Como se reparte hoy tu ciclo entre fijos, variables, tarjetas y ahorro.
                    </p>

                    <div className="mt-4">
                        <SpendingMixChart
                            data={distributionRows}
                            total={cycleTotal}
                            currency={kpiBundle.currency}
                            locale={kpiBundle.locale}
                        />
                    </div>

                    <div className="mt-3 space-y-2">
                        {distributionRows.map((row) => {
                            const ratio = cycleTotal > 0 ? (row.value / cycleTotal) * 100 : 0;
                            return (
                                <div key={row.label} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: row.color }}
                                        />
                                        <span className="text-surface-600">{row.label}</span>
                                    </div>
                                    <span className="font-semibold text-[#0f2233]">
                                        {format.percent.format(ratio)}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Pagos de tarjeta</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Fechas de pago y peso de cada tarjeta dentro del total programado.
                    </p>

                    {sortedCards.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-8 text-center text-sm text-surface-500">
                            No hay tarjetas configuradas en este workspace.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {sortedCards.map((card) => {
                                const share =
                                    totalScheduledCardPayments > 0
                                        ? (card.expectedPayment / totalScheduledCardPayments) * 100
                                        : 0;

                                return (
                                    <article
                                        key={`${card.name}-${card.paymentDay}`}
                                        className="rounded-xl border border-[#e8eef7] bg-[#fbfdff] px-3 py-3"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm font-semibold text-[#0f2233]">
                                                {card.name}
                                            </p>
                                            <p className="text-sm font-semibold text-negative-600">
                                                -{format.money.format(card.expectedPayment)}
                                            </p>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs text-surface-500">
                                            <span>
                                                Dia {card.paymentDay} · {cardStrategyLabel(card.strategy)}
                                            </span>
                                            <span>{format.percent.format(share)}%</span>
                                        </div>
                                        <div className="mt-2 h-2 w-full rounded-full bg-[#e8edf6]">
                                            <div
                                                className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#117068)]"
                                                style={{ width: `${Math.min(Math.max(share, 4), 100)}%` }}
                                            />
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Metas de ahorro</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Tu meta activa y el avance de cada objetivo financiero.
                    </p>

                    {topGoal ? (
                        <div className="mt-4 rounded-xl border border-[#cfe3d8] bg-[#f2faf6] px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4d6f55]">
                                Meta principal
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <p className="truncate text-base font-semibold text-[#0f2233]">{topGoal.name}</p>
                                <p className="text-sm font-semibold text-[#117068]">
                                    {format.percent.format(topGoalProgress)}%
                                </p>
                            </div>
                            <p className="mt-1 text-xs text-surface-600">
                                {format.money.format(topGoal.current_amount)} de {format.money.format(topGoal.target_amount)}
                            </p>
                        </div>
                    ) : null}

                    {savingsGoals.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-8 text-center text-sm text-surface-500">
                            Todavia no tienes metas. Crea una en configuracion para empezar.
                        </div>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {savingsGoals.map((goal) => {
                                const progress = goalProgress(goal.current_amount, goal.target_amount);

                                return (
                                    <article
                                        key={goal.id}
                                        className="rounded-xl border border-[#e8eef7] bg-[#fbfdff] px-3 py-3"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm font-semibold text-[#0f2233]">
                                                {goal.name}
                                            </p>
                                            <span className="text-xs font-semibold text-[#0d4c7a]">
                                                {format.percent.format(progress)}%
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2 w-full rounded-full bg-[#e8edf6]">
                                            <div
                                                className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#117068)]"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-surface-500">
                                            <span>Actual {format.money.format(goal.current_amount)}</span>
                                            <span>Meta {format.money.format(goal.target_amount)}</span>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-4">
                        <Link
                            href="/dashboard/settings#metas-ahorro"
                            className="text-xs font-semibold text-[#0d4c7a] no-underline hover:text-[#117068]"
                        >
                            Gestionar metas y prioridades →
                        </Link>
                    </div>
                </article>
            </section>
        </div>
    );
}

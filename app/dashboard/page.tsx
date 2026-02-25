import Link from "next/link";
import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";

function formatter(locale: "es" | "en", currency: string) {
    const language = locale === "en" ? "en-US" : "es-PE";
    return {
        money: new Intl.NumberFormat(language, { style: "currency", currency }),
        percent: new Intl.NumberFormat(language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        number: new Intl.NumberFormat(language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        date: new Intl.DateTimeFormat(language, {
            year: "numeric",
            month: "short",
            day: "numeric",
        }),
    };
}

function formatDayList(days: number[]) {
    const normalized = Array.from(new Set(days))
        .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31)
        .sort((a, b) => a - b);
    if (normalized.length === 0) return "No definido";
    return normalized.map((day) => `día ${day}`).join(" · ");
}

export default async function DashboardPage() {
    const [kpiBundle, recentTransactions] = await Promise.all([
        getDashboardKPIs(),
        getRecentTransactions(),
    ]);

    const format = formatter(kpiBundle.locale, kpiBundle.currency);
    const summary = kpiBundle.summary || {
        accounts: 0,
        categories: 0,
        budgetsMonth: 0,
        transactions12m: 0,
    };
    const isBusiness = kpiBundle.orgType === "business" && Boolean(kpiBundle.business);
    const personal = kpiBundle.personal;
    const business = kpiBundle.business;
    const savingsGoals = kpiBundle.savingsGoals || [];
    const savingsPlan = kpiBundle.personalSavingsPlan;
    const cycle = kpiBundle.personalCycle || null;
    const hasRealMovements = summary.transactions12m > 0;
    const personalBudgetVariance = personal?.budgetVariance || 0;
    const budgetSignalLabel =
        personalBudgetVariance <= 0 ? "Margen presupuesto" : "Exceso presupuesto";
    const budgetSignalValue = Math.abs(personalBudgetVariance);
    const setupChecklist = [
        {
            label: "Estructura base",
            detail: "Cuentas y categorías iniciales",
            done: summary.accounts > 0 && summary.categories > 0,
            href: "/dashboard/settings#estructura-financiera",
        },
        {
            label: "Plan mensual",
            detail: "Topes de presupuesto activos",
            done: summary.budgetsMonth > 0,
            href: "/dashboard/budget",
        },
        {
            label: "Ejecución real",
            detail: "Movimientos registrados",
            done: summary.transactions12m > 0,
            href: "/dashboard/transactions/new",
        },
    ];
    const completedChecklist = setupChecklist.filter((item) => item.done).length;

    const hasEmergencyFundBaseData =
        (personal?.expenseMonthsObserved || 0) >= 2 &&
        (personal?.avgMonthlyExpenses || 0) > 0;
    const emergencyFundMonths = personal?.emergencyFundMonths || 0;
    const emergencyFundDisplay = !hasEmergencyFundBaseData
        ? "Datos insuficientes"
        : emergencyFundMonths >= 60
          ? "60+ meses"
          : `${format.number.format(emergencyFundMonths)} meses`;

    const cycleEvents = cycle
        ? [
              ...cycle.incomePaymentDays.map((day) => ({
                  day,
                  label: "Abono ingreso principal",
                  detail: "Entrada de ingresos del titular",
              })),
              ...cycle.partnerIncomePaymentDays.map((day) => ({
                  day,
                  label: "Abono ingreso compartido",
                  detail: "Aporte de pareja/familiar",
              })),
              ...cycle.cardSchedules.map((card) => ({
                  day: card.paymentDay,
                  label: `Pago tarjeta: ${card.name}`,
                  detail:
                      card.strategy === "full"
                          ? "Estrategia: pago total"
                          : card.strategy === "minimum"
                            ? "Estrategia: pago mínimo"
                            : "Estrategia: pago fijo",
              })),
          ].sort((a, b) => a.day - b.day)
        : [];

    const metricCards: Array<{
        label: string;
        value: string;
        status: string;
        note?: string;
    }> = isBusiness && business
        ? [
              {
                  label: "Revenue",
                  value: format.money.format(business.revenue),
                  status:
                      business.revenue > 0
                          ? "text-[#0f2233]"
                          : "text-surface-500",
              },
              {
                  label: "Operating Income (EBIT)",
                  value: format.money.format(business.operatingIncome),
                  status:
                      business.operatingIncome >= 0
                          ? "text-positive-600"
                          : "text-negative-600",
              },
              {
                  label: "Operating Margin",
                  value: `${format.percent.format(business.operatingMarginPct)}%`,
                  status:
                      business.operatingMarginPct >= 10
                          ? "text-positive-600"
                          : "text-warning-600",
              },
              {
                  label: "Budget Variance",
                  value: format.money.format(business.budgetVariance),
                  status:
                      business.budgetVariance <= 0
                          ? "text-positive-600"
                          : "text-warning-600",
              },
              {
                  label: "Forecast EBIT",
                  value: format.money.format(business.forecastEbit),
                  status:
                      business.forecastEbit >= 0
                          ? "text-[#0f2233]"
                          : "text-negative-600",
              },
          ]
        : [
              {
                  label: "Flujo de caja neto",
                  value: format.money.format(personal?.netCashFlow || 0),
                  status:
                      (personal?.netCashFlow || 0) >= 0
                          ? "text-positive-600"
                          : "text-negative-600",
              },
              {
                  label: "Tasa de ahorro",
                  value: `${format.percent.format(personal?.savingsRatePct || 0)}%`,
                  status:
                      (personal?.savingsRatePct || 0) >= 20
                          ? "text-positive-600"
                          : "text-warning-600",
              },
              {
                  label: "Patrimonio neto",
                  value: format.money.format(personal?.netWorth || 0),
                  status:
                      (personal?.netWorth || 0) >= 0
                          ? "text-[#0f2233]"
                          : "text-negative-600",
                  note: `Activos ${format.money.format(personal?.assets || 0)} · Pasivos ${format.money.format(personal?.liabilities || 0)}`,
              },
              {
                  label: "Cobertura de emergencia",
                  value: emergencyFundDisplay,
                  status:
                      !hasEmergencyFundBaseData
                          ? "text-warning-600"
                          : "text-[#0f2233]",
              },
              {
                  label: budgetSignalLabel,
                  value: format.money.format(budgetSignalValue),
                  status: personalBudgetVariance <= 0 ? "text-positive-600" : "text-warning-600",
                  note:
                      personalBudgetVariance <= 0
                          ? "Monto que aún tienes disponible este mes."
                          : "Monto por encima de tu plan mensual.",
              },
          ];

    return (
        <div className="space-y-7 animate-fade-in">
            <section className="rounded-3xl border border-[#d9e2f0] bg-white p-7 shadow-card">
                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-400">
                            Flujo mensual
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">
                            {isBusiness ? "Centro financiero del negocio" : "Centro financiero personal"}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-600">
                            Un solo ciclo: configuras estructura, registras movimientos, controlas presupuesto y ajustas proyección.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link
                                href="/dashboard/transactions/new"
                                className="btn-primary text-sm no-underline hover:text-white"
                            >
                                Registrar movimiento
                            </Link>
                            <Link
                                href="/dashboard/budget"
                                className="btn-secondary text-sm no-underline"
                            >
                                Control mensual
                            </Link>
                            <Link
                                href="/dashboard/settings#estructura-financiera"
                                className="btn-secondary text-sm no-underline"
                            >
                                Ajustar configuración base
                            </Link>
                        </div>
                    </div>

                    <article className="rounded-2xl border border-[#d9e2f0] bg-[#f5f9ff] p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
                            Estado actual del flujo
                        </p>
                        <div className="mt-4 space-y-2.5 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-600">Cuentas activas</span>
                                <span className="font-semibold text-[#0f2233]">{summary.accounts}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-surface-600">Categorías activas</span>
                                <span className="font-semibold text-[#0f2233]">{summary.categories}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-surface-600">Topes en presupuesto (mes)</span>
                                <span className="font-semibold text-[#0f2233]">{summary.budgetsMonth}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-surface-600">Movimientos reales (12m)</span>
                                <span className="font-semibold text-[#0f2233]">{summary.transactions12m}</span>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
                                Checklist de arranque
                            </p>
                            <p className="mt-1 text-sm text-surface-600">
                                {completedChecklist} de {setupChecklist.length} bloques operativos listos.
                            </p>
                        </div>
                        <span className="rounded-full border border-[#d9e2f0] bg-[#f5f9ff] px-3 py-1 text-xs font-semibold text-[#0f2233]">
                            {Math.round((completedChecklist / setupChecklist.length) * 100)}% completado
                        </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {setupChecklist.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`rounded-xl border px-4 py-3 no-underline transition-colors ${
                                    item.done
                                        ? "border-[#bfe1d8] bg-[#eef9f5]"
                                        : "border-[#f3dec1] bg-[#fff6ea]"
                                }`}
                            >
                                <p className="text-sm font-semibold text-[#0f2233]">{item.label}</p>
                                <p className="mt-1 text-xs text-surface-600">{item.detail}</p>
                                <p className="mt-2 text-xs font-semibold">
                                    {item.done ? "Configurado" : "Pendiente"}
                                </p>
                            </Link>
                        ))}
                    </div>
                </article>
                {!isBusiness && (
                    <article className="rounded-2xl border border-[#d9e2f0] bg-[#f5f9ff] p-5 shadow-card">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
                            Datos del onboarding
                        </p>
                        <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-600">Ingreso consolidado</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {format.money.format(savingsPlan?.consolidatedIncome || 0)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-surface-600">Ahorro mensual planificado</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {format.money.format(savingsPlan?.monthlySavingsPool || 0)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-surface-600">Registros de metas</span>
                                <span className="font-semibold text-[#0f2233]">{savingsGoals.length}</span>
                            </div>
                        </div>
                    </article>
                )}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {metricCards.map((metric) => (
                    <article
                        key={metric.label}
                        className="rounded-2xl border border-[#d9e2f0] bg-white p-4 shadow-card"
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.11em] text-surface-500">
                            {metric.label}
                        </p>
                        <p className={`mt-2 text-2xl font-semibold ${metric.status}`}>
                            {metric.value}
                        </p>
                        {metric.note ? (
                            <p className="mt-1 text-xs text-surface-500">{metric.note}</p>
                        ) : null}
                    </article>
                ))}
            </section>

            {!hasRealMovements && (
                <section className="rounded-2xl border border-[#b8d8f0] bg-[#edf6fd] px-5 py-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-[#0f2233]">
                        Aún no hay ejecución real del ciclo
                    </h3>
                    <p className="mt-1 text-sm text-surface-600">
                        Los indicadores en cero o “datos insuficientes” son normales hasta registrar movimientos reales.
                    </p>
                </section>
            )}

            {!isBusiness && cycle && (
                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-[#10283b]">
                                Ciclo mensual explicado
                            </h3>
                            <p className="mt-1 text-sm text-surface-500">
                                Este bloque convierte tu onboarding en flujo operativo entendible.
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#d9e2f0] bg-[#f5f9ff] px-3 py-2 text-right">
                            <p className="text-xs text-surface-500">Inicio de ciclo</p>
                            <p className="text-sm font-semibold text-[#0f2233]">
                                {cycle.startDate
                                    ? `Día ${cycle.cycleDay} (${format.date.format(new Date(cycle.startDate))})`
                                    : `Día ${cycle.cycleDay}`}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-surface-200">
                                    <tr>
                                        <td className="py-2 text-surface-600">Ingreso consolidado mensual</td>
                                        <td className="py-2 text-right font-semibold text-[#0f2233]">
                                            {format.money.format(savingsPlan?.consolidatedIncome || 0)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-surface-600">Gastos fijos planificados</td>
                                        <td className="py-2 text-right font-semibold text-negative-600">
                                            -{format.money.format(cycle.fixedPlanned)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-surface-600">Gastos variables planificados</td>
                                        <td className="py-2 text-right font-semibold text-negative-600">
                                            -{format.money.format(cycle.variablePlanned)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-surface-600">Pago total tarjetas</td>
                                        <td className="py-2 text-right font-semibold text-negative-600">
                                            -{format.money.format(cycle.fullCardPayments)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-surface-600">Pago mínimo revolvente</td>
                                        <td className="py-2 text-right font-semibold text-negative-600">
                                            -{format.money.format(cycle.revolvingMinimumPayments)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 text-surface-600">Ahorro mensual planificado</td>
                                        <td className="py-2 text-right font-semibold text-[#0f2233]">
                                            -{format.money.format(cycle.plannedSavings)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 font-semibold text-[#117068]">Saldo libre proyectado</td>
                                        <td className="py-2 text-right font-semibold text-[#117068]">
                                            {format.money.format(cycle.projectedFreeCash)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </article>

                        <article className="rounded-2xl border border-[#d9e2f0] bg-[#f5f9ff] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.11em] text-surface-500">
                                Agenda del ciclo
                            </p>
                            <div className="mt-3 space-y-2.5 text-sm">
                                <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                    <p className="font-semibold text-[#0f2233]">Abono de ingresos</p>
                                    <p className="text-surface-600">
                                        Principal: {formatDayList(cycle.incomePaymentDays)}
                                    </p>
                                    {cycle.partnerIncomePaymentDays.length > 0 && (
                                        <p className="text-surface-600">
                                            Compartido: {formatDayList(cycle.partnerIncomePaymentDays)}
                                        </p>
                                    )}
                                </div>

                                {cycleEvents.length === 0 ? (
                                    <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2 text-surface-600">
                                        Sin eventos configurados todavía.
                                    </div>
                                ) : (
                                    cycleEvents.map((event, index) => (
                                        <div
                                            key={`${event.label}-${event.day}-${index}`}
                                            className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2"
                                        >
                                            <p className="font-semibold text-[#0f2233]">
                                                Día {event.day} · {event.label}
                                            </p>
                                            <p className="text-xs text-surface-500">{event.detail}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </article>
                    </div>
                </section>
            )}

            {savingsGoals.length > 0 && (
                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="text-lg font-semibold text-[#10283b]">Metas de ahorro</h3>
                            <p className="text-sm text-surface-500">Progreso y ritmo mensual asignado.</p>
                        </div>
                        {savingsPlan && (
                            <div className="rounded-xl border border-[#d9e2f0] bg-[#f5f9ff] px-3 py-2 text-right">
                                <p className="text-xs text-surface-500">Ahorro mensual planificado</p>
                                <p className="text-sm font-semibold text-[#0f2233]">
                                    {format.money.format(savingsPlan.monthlySavingsPool)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {savingsGoals.map((goal) => {
                            const current = Number(goal.current_amount) || 0;
                            const target = Number(goal.target_amount) || 1;
                            const percent = Math.min((current / target) * 100, 100);
                            const monthlyContribution = Number(goal.monthly_contribution) || 0;
                            const consolidatedIncome = savingsPlan?.consolidatedIncome || 0;
                            const percentOfIncome =
                                consolidatedIncome > 0
                                    ? (monthlyContribution / consolidatedIncome) * 100
                                    : 0;

                            return (
                                <article
                                    key={goal.id}
                                    className="rounded-2xl border border-[#d9e2f0] bg-[#f8fbff] p-4"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-[#0f2233]">{goal.name}</p>
                                        <span className="text-xs font-semibold text-[#0d4c7a]">
                                            {format.percent.format(percent)}%
                                        </span>
                                    </div>

                                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface-200">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#117068)]"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>

                                    <div className="mt-3 space-y-1 text-xs text-surface-600">
                                        <p>
                                            Actual: <span className="font-semibold text-[#0f2233]">{format.money.format(current)}</span>
                                        </p>
                                        <p>
                                            Meta: <span className="font-semibold text-[#0f2233]">{format.money.format(target)}</span>
                                        </p>
                                        <p>
                                            Aporte mensual: <span className="font-semibold text-[#0f2233]">{format.money.format(monthlyContribution)}</span>
                                        </p>
                                        <p>
                                            % de ingreso: <span className="font-semibold text-[#0f2233]">{format.percent.format(percentOfIncome)}%</span>
                                        </p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[#10283b]">Movimientos recientes</h3>
                    <Link
                        href="/dashboard/transactions"
                        className="text-sm font-semibold text-[#0d4c7a] hover:text-[#117068]"
                    >
                        Ver libro completo
                    </Link>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                        Todavía no existen transacciones en esta organización.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#d9e2f0]">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-[#f5f9ff]">
                                <tr className="text-left text-surface-500">
                                    <th className="px-4 py-3 font-semibold">Descripción</th>
                                    <th className="px-4 py-3 font-semibold">Categoría</th>
                                    <th className="px-4 py-3 font-semibold">Cuenta</th>
                                    <th className="px-4 py-3 font-semibold">Fecha</th>
                                    <th className="px-4 py-3 text-right font-semibold">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200 bg-white">
                                {recentTransactions.map(
                                    (item: {
                                        id: string;
                                        description: string;
                                        date: string;
                                        amount: number;
                                        categories_gl: { name: string } | null;
                                        accounts: { name: string } | null;
                                    }) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3 font-medium text-[#0f2233]">
                                                {item.description}
                                            </td>
                                            <td className="px-4 py-3 text-surface-600">
                                                {item.categories_gl?.name || "Sin categoría"}
                                            </td>
                                            <td className="px-4 py-3 text-surface-600">
                                                {item.accounts?.name || "Sin cuenta"}
                                            </td>
                                            <td className="px-4 py-3 text-surface-600">
                                                {format.date.format(new Date(item.date))}
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right font-semibold ${
                                                    item.amount >= 0
                                                        ? "text-positive-600"
                                                        : "text-negative-600"
                                                }`}
                                            >
                                                {item.amount >= 0 ? "+" : "-"}
                                                {format.money.format(Math.abs(item.amount))}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

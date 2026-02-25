import Link from "next/link";
import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";
import { KPICard } from "@/components/ui/KPICard";
import { ArrowRightIcon } from "@/components/ui/icons";

function formatter(locale: "es" | "en", currency: string) {
    const language = locale === "en" ? "en-US" : "es-PE";
    return {
        money: new Intl.NumberFormat(language, { style: "currency", currency }),
        percent: new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        number: new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        date: new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric" }),
    };
}

function formatDayList(days: number[]) {
    const uniqueSortedDays = Array.from(new Set(days))
        .filter((day) => Number.isFinite(day) && day >= 1 && day <= 31)
        .sort((a, b) => a - b);
    if (uniqueSortedDays.length === 0) return "No definido";
    return uniqueSortedDays.map((day) => `día ${day}`).join(" · ");
}

export default async function DashboardPage() {
    const [kpiBundle, recentTransactions] = await Promise.all([
        getDashboardKPIs(),
        getRecentTransactions(),
    ]);

    const savingsGoals = kpiBundle.savingsGoals || [];
    const savingsPlan = kpiBundle.personalSavingsPlan;
    const format = formatter(kpiBundle.locale, kpiBundle.currency);
    const personal = kpiBundle.personal;
    const hasEmergencyFundBaseData =
        (personal?.expenseMonthsObserved || 0) >= 2 && (personal?.avgMonthlyExpenses || 0) > 0;
    const emergencyFundMonths = personal?.emergencyFundMonths || 0;
    const emergencyFundDisplay = !hasEmergencyFundBaseData
        ? "Datos insuficientes"
        : emergencyFundMonths >= 60
            ? "60+ meses"
            : `${format.number.format(emergencyFundMonths)} meses`;
    const emergencyFundTooltip = !hasEmergencyFundBaseData
        ? "Necesitamos al menos dos meses de gastos reales para estimar tu cobertura con precisión."
        : "Indica cuántos meses puedes pagar tus gastos mensuales con tu efectivo actual si te quedas sin ingresos.";
    const consolidatedIncome = savingsPlan?.consolidatedIncome || 0;
    const summary = kpiBundle.summary || {
        accounts: 0,
        categories: 0,
        budgetsMonth: 0,
        transactions12m: 0,
    };
    const cycle = kpiBundle.personalCycle || null;
    const hasRealMovements = summary.transactions12m > 0;

    const cards =
        kpiBundle.orgType === "business" && kpiBundle.business
            ? [
                {
                    label: "Revenue",
                    value: format.money.format(kpiBundle.business.revenue),
                    tooltip: "Suma de ingresos operativos del período.",
                    formula: "Revenue = Σ GL.kind = revenue",
                    variant: "default" as const,
                },
                {
                    label: "Operating Income (EBIT)",
                    value: format.money.format(kpiBundle.business.operatingIncome),
                    tooltip: "Resultado operativo antes de intereses e impuestos.",
                    formula: "EBIT = Revenue - COGS - OPEX",
                    variant: kpiBundle.business.operatingIncome >= 0 ? "positive" as const : "negative" as const,
                },
                {
                    label: "Operating Margin",
                    value: `${format.percent.format(kpiBundle.business.operatingMarginPct)}%`,
                    tooltip: "Porcentaje de rentabilidad operativa del período.",
                    formula: "Operating Margin = EBIT / Revenue",
                    variant: kpiBundle.business.operatingMarginPct >= 10 ? "positive" as const : "warning" as const,
                },
                {
                    label: "Forecast EBIT",
                    value: format.money.format(kpiBundle.business.forecastEbit),
                    tooltip: "Proyección de utilidad operativa según supuestos actuales.",
                    formula: "Forecast EBIT = Forecast Revenue - Forecast COGS - Forecast OPEX",
                    variant: kpiBundle.business.forecastEbit >= 0 ? "default" as const : "negative" as const,
                },
                {
                    label: "Budget Variance",
                    value: format.money.format(kpiBundle.business.budgetVariance),
                    tooltip: "Diferencia agregada entre presupuesto y ejecución mensual.",
                    formula: "Variance = Actual - Budget",
                    variant: kpiBundle.business.budgetVariance <= 0 ? "positive" as const : "warning" as const,
                },
                {
                    label: "Restricted Cash",
                    value: format.money.format(kpiBundle.business.restrictedCash),
                    tooltip: "Saldo reservado para fines específicos (ej. detracciones).",
                    variant: "default" as const,
                },
            ]
            : [
                {
                    label: "Flujo de caja neto",
                    value: format.money.format(kpiBundle.personal?.netCashFlow || 0),
                    tooltip: "Ingresos menos egresos del mes corriente.",
                    formula: "Net Cash Flow = Σ ingresos - Σ gastos",
                    variant: (kpiBundle.personal?.netCashFlow || 0) >= 0 ? "positive" as const : "negative" as const,
                },
                {
                    label: "Tasa de ahorro",
                    value: `${format.percent.format(kpiBundle.personal?.savingsRatePct || 0)}%`,
                    tooltip: "Porcentaje de ingresos que permanece como ahorro.",
                    formula: "Savings Rate = (Income - Expenses) / Income",
                    variant: (kpiBundle.personal?.savingsRatePct || 0) >= 20 ? "positive" as const : "warning" as const,
                },
                {
                    label: "Patrimonio neto",
                    value: format.money.format(kpiBundle.personal?.netWorth || 0),
                    tooltip: "Activos menos pasivos de todas tus cuentas.",
                    formula: "Net Worth = Assets - Liabilities",
                    variant: "default" as const,
                },
                {
                    label: "Meses de cobertura (fondo de emergencia)",
                    value: emergencyFundDisplay,
                    tooltip: emergencyFundTooltip,
                    formula: "Meses de cobertura = efectivo líquido / gasto mensual promedio",
                    variant: !hasEmergencyFundBaseData
                        ? "warning" as const
                        : (kpiBundle.personal?.emergencyFundMonths || 0) >= 6
                            ? "positive" as const
                            : "warning" as const,
                },
                {
                    label: "Desviación presupuesto",
                    value: format.money.format(kpiBundle.personal?.budgetVariance || 0),
                    tooltip: "Diferencia entre gasto real y presupuesto del mes.",
                    formula: "Variance = Actual - Budget",
                    variant: (kpiBundle.personal?.budgetVariance || 0) <= 0 ? "positive" as const : "warning" as const,
                },
            ];

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold text-[#0f2233]">
                            {kpiBundle.orgType === "business" ? "Resumen del negocio" : "Tu resumen financiero"}
                        </h2>
                        <p className="mt-1 text-sm text-surface-500">
                            Panel operativo con tus datos reales de cuentas, movimientos y planificación.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            Registrar movimiento
                        </Link>
                        <Link href="/dashboard/budget" className="btn-secondary text-sm no-underline">
                            Presupuesto
                        </Link>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Circuito de trabajo</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Flujo recomendado para mantener el sistema ordenado y actualizado.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">1. Estructura</p>
                        <p className="mt-2 text-sm font-semibold text-[#0f2233]">
                            {summary.accounts} cuentas · {summary.categories} categorías
                        </p>
                        <p className="mt-1 text-xs text-surface-500">Base contable para operar sin ruido.</p>
                        <Link href="/dashboard/settings#estructura-financiera" className="mt-3 inline-block text-sm font-semibold text-[#0d4c7a] hover:text-[#117068]">
                            Ir a configuración
                        </Link>
                    </article>

                    <article className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">2. Registro diario</p>
                        <p className="mt-2 text-sm font-semibold text-[#0f2233]">{summary.transactions12m} movimientos (12m)</p>
                        <p className="mt-1 text-xs text-surface-500">Cada movimiento alimenta KPIs, presupuesto y pronóstico.</p>
                        <Link href="/dashboard/transactions/new" className="mt-3 inline-block text-sm font-semibold text-[#0d4c7a] hover:text-[#117068]">
                            Registrar movimiento
                        </Link>
                    </article>

                    <article className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">3. Control mensual</p>
                        <p className="mt-2 text-sm font-semibold text-[#0f2233]">{summary.budgetsMonth} categorías con tope</p>
                        <p className="mt-1 text-xs text-surface-500">Compara tope planificado contra ejecución real.</p>
                        <Link href="/dashboard/budget" className="mt-3 inline-block text-sm font-semibold text-[#0d4c7a] hover:text-[#117068]">
                            Revisar presupuesto
                        </Link>
                    </article>

                    <article className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">4. Decisión</p>
                        <p className="mt-2 text-sm font-semibold text-[#0f2233]">Asistente y pronóstico</p>
                        <p className="mt-1 text-xs text-surface-500">Usa escenarios para decidir ajustes de ingreso y ahorro.</p>
                        <Link href="/dashboard/assistant" className="mt-3 inline-block text-sm font-semibold text-[#0d4c7a] hover:text-[#117068]">
                            Ver recomendaciones
                        </Link>
                    </article>
                </div>
            </section>

            <section className={`grid gap-4 ${cards.length >= 6 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"}`}>
                {cards.map((card) => (
                    <KPICard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        tooltip={card.tooltip}
                        formula={card.formula}
                        variant={card.variant}
                    />
                ))}
            </section>

            {!hasRealMovements && kpiBundle.orgType === "personal" && (
                <section className="rounded-2xl border border-[#d6e3f0] bg-[#f3f8fd] px-5 py-4 shadow-card">
                    <p className="text-sm font-semibold text-[#0f2233]">Cómo interpretar estos valores ahora</p>
                    <p className="mt-1 text-sm text-surface-600">
                        Aún no tienes movimientos registrados. Por eso flujo de caja y tasa de ahorro están en cero, y la desviación de presupuesto refleja
                        presupuesto planificado sin gasto ejecutado.
                    </p>
                </section>
            )}

            {kpiBundle.orgType === "personal" && cycle && (
                <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Calendario y flujo del ciclo mensual</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Esta vista traduce lo que configuraste en onboarding a una secuencia operativa mensual.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <article className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Inicio de ciclo</p>
                            <p className="mt-2 text-sm font-semibold text-[#0f2233]">
                                {cycle.startDate ? `Día ${cycle.cycleDay}` : "Día 1 (por defecto)"}
                            </p>
                            <p className="mt-1 text-xs text-surface-500">
                                {cycle.startDate ? `Ancla configurada: ${format.date.format(new Date(cycle.startDate))}` : "Sin fecha ancla guardada."}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Abonos de ingreso</p>
                            <p className="mt-2 text-sm font-semibold text-[#0f2233]">{formatDayList(cycle.incomePaymentDays)}</p>
                            {cycle.partnerIncomePaymentDays.length > 0 && (
                                <p className="mt-1 text-xs text-surface-500">
                                    Aporte compartido: {formatDayList(cycle.partnerIncomePaymentDays)}
                                </p>
                            )}
                        </article>

                        <article className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Pagos de tarjeta</p>
                            <p className="mt-2 text-sm font-semibold text-[#0f2233]">
                                {cycle.cardSchedules.length === 0
                                    ? "Sin tarjetas registradas"
                                    : cycle.cardSchedules
                                          .map((card) => `${card.name}: día ${card.paymentDay}`)
                                          .join(" · ")}
                            </p>
                        </article>

                        <article className="rounded-2xl border border-[#bedfd8] bg-[#edf9f6] p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#117068]">Saldo proyectado del ciclo</p>
                            <p className="mt-2 text-sm font-semibold text-[#117068]">{format.money.format(cycle.projectedFreeCash)}</p>
                            <p className="mt-1 text-xs text-surface-600">Ingreso - compromisos operativos - ahorro planificado.</p>
                        </article>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-2xl border border-surface-200">
                        <table className="w-full min-w-[720px] text-sm">
                            <tbody className="divide-y divide-surface-200">
                                <tr className="bg-white">
                                    <td className="px-4 py-3 text-surface-600">Ingreso consolidado mensual</td>
                                    <td className="px-4 py-3 text-right font-semibold text-[#0f2233]">
                                        {format.money.format(savingsPlan?.consolidatedIncome || 0)}
                                    </td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 text-surface-600">Gastos fijos planificados</td>
                                    <td className="px-4 py-3 text-right font-semibold text-negative-600">
                                        -{format.money.format(cycle.fixedPlanned)}
                                    </td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 text-surface-600">Gastos variables planificados</td>
                                    <td className="px-4 py-3 text-right font-semibold text-negative-600">
                                        -{format.money.format(cycle.variablePlanned)}
                                    </td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 text-surface-600">Pago total de tarjetas</td>
                                    <td className="px-4 py-3 text-right font-semibold text-negative-600">
                                        -{format.money.format(cycle.fullCardPayments)}
                                    </td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 text-surface-600">Pago mínimo de deuda revolvente</td>
                                    <td className="px-4 py-3 text-right font-semibold text-negative-600">
                                        -{format.money.format(cycle.revolvingMinimumPayments)}
                                    </td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="px-4 py-3 text-surface-600">Ahorro mensual planificado</td>
                                    <td className="px-4 py-3 text-right font-semibold text-[#0f2233]">
                                        -{format.money.format(cycle.plannedSavings)}
                                    </td>
                                </tr>
                                <tr className="bg-[#edf9f6]">
                                    <td className="px-4 py-3 font-semibold text-[#117068]">Saldo estimado libre del ciclo</td>
                                    <td className="px-4 py-3 text-right font-semibold text-[#117068]">
                                        {format.money.format(cycle.projectedFreeCash)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ================= SAVINGS GOALS (MIS METAS) ================= */}
            {savingsGoals.length > 0 && (
                <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="text-lg font-semibold text-[#10283b]">Mis metas de ahorro</h3>
                            <p className="text-sm text-surface-500">Progreso de tus objetivos de ahorro</p>
                        </div>
                        {savingsPlan && (
                            <div className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-right">
                                <p className="text-xs text-surface-500">Ahorro mensual planificado</p>
                                <p className="text-sm font-semibold text-[#0f2233]">
                                    {format.money.format(savingsPlan.monthlySavingsPool)}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {savingsGoals.map((goal) => {
                            const current = Number(goal.current_amount) || 0;
                            const target = Number(goal.target_amount) || 1;
                            const percent = Math.min((current / target) * 100, 100);
                            const monthlyContribution = Number(goal.monthly_contribution) || 0;
                            const percentOfIncome =
                                consolidatedIncome > 0
                                    ? (monthlyContribution / consolidatedIncome) * 100
                                    : 0;

                            return (
                                <article key={goal.id} className="rounded-2xl border border-surface-200 bg-surface-50/50 p-4 shadow-sm relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-sm font-bold text-[#0f2233] truncate pr-2">{goal.name}</p>
                                        <span className="text-xs font-semibold px-2 py-1 bg-white border border-surface-200 rounded-full text-primary-700 whitespace-nowrap">
                                            {format.percent.format(percent)}%
                                        </span>
                                    </div>

                                    <div className="h-2.5 w-full bg-surface-200 rounded-full overflow-hidden mb-3">
                                        <div
                                            className="h-full bg-[linear-gradient(90deg,#0d4c7a_0%,#117068_100%)] transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-surface-600 font-medium">
                                        <span>{format.money.format(current)}</span>
                                        <span>Meta: {format.money.format(target)}</span>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-surface-200/60 text-xs text-surface-500 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span>Aporte mensual proyectado</span>
                                            <span className="font-semibold text-surface-700">
                                                {format.money.format(monthlyContribution)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>% de ingreso asignado</span>
                                            <span className="font-semibold text-surface-700">
                                                {format.percent.format(percentOfIncome)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Fecha estimada</span>
                                            <span className="font-semibold text-surface-700 text-right">
                                                {goal.estimated_completion_date
                                                    ? format.date.format(
                                                          new Date(goal.estimated_completion_date)
                                                      )
                                                    : "Sin proyección"}
                                            </span>
                                        </div>
                                    </div>

                                    {goal.deadline_date && (
                                        <div className="mt-3 pt-3 border-t border-surface-200/60 text-[11px] text-surface-400 flex items-center justify-between">
                                            <span>Fecha límite:</span>
                                            <span className="font-semibold text-surface-500 text-right">{format.date.format(new Date(goal.deadline_date))}</span>
                                        </div>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[#10283b]">Movimientos recientes</h3>
                    <Link href="/dashboard/transactions" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d4c7a] hover:text-[#117068]">
                        Ver libro completo
                        <ArrowRightIcon size={13} />
                    </Link>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                        Todavía no existen transacciones en esta organización.
                    </div>
                ) : (
                    <div className="divide-y rounded-2xl border border-surface-200 bg-white">
                        {recentTransactions.map((item: { id: string; description: string; date: string; amount: number; categories_gl: { name: string } | null; accounts: { name: string } | null }) => (
                            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-[#0f2233]">{item.description}</p>
                                    <p className="text-xs text-surface-500">
                                        {item.categories_gl?.name || "Sin categoría"} ·{" "}
                                        {item.accounts?.name || "Cuenta no definida"} ·{" "}
                                        {format.date.format(new Date(item.date))}
                                    </p>
                                </div>
                                <span className={`text-sm font-semibold ${item.amount >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                    {item.amount >= 0 ? "+" : "-"}
                                    {format.money.format(Math.abs(item.amount))}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

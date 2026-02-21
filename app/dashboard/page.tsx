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

export default async function DashboardPage() {
    const [kpiBundle, recentTransactions] = await Promise.all([
        getDashboardKPIs(),
        getRecentTransactions(),
    ]);

    const format = formatter(kpiBundle.locale, kpiBundle.currency);

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
                    label: "Fondo de emergencia",
                    value: `${format.number.format(kpiBundle.personal?.emergencyFundMonths || 0)} meses`,
                    tooltip: "Meses de cobertura con liquidez disponible.",
                    formula: "Coverage = Liquid Cash / Avg Monthly Expenses",
                    variant: (kpiBundle.personal?.emergencyFundMonths || 0) >= 6 ? "positive" as const : "warning" as const,
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
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                    Panel financiero
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">
                    {kpiBundle.orgType === "business" ? "Visión ejecutiva del negocio" : "Visión integral personal"}
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-surface-500">
                    {kpiBundle.orgType === "business"
                        ? "Monitorea margen operativo, ejecución presupuestal y proyección de EBIT en una sola vista."
                        : "Monitorea flujo de caja, ahorro y patrimonio para sostener decisiones financieras diarias."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                        Registrar movimiento
                    </Link>
                    <Link href="/dashboard/budget" className="btn-secondary text-sm no-underline">
                        Revisar presupuesto
                    </Link>
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

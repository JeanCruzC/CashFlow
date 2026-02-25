import Link from "next/link";
import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";
import { CashFlowChart } from "@/components/ui/CashFlowChart";
import { BudgetRing } from "@/components/ui/BudgetRing";

interface RecentTransactionRow {
    id: string;
    description: string;
    date: string;
    amount: number;
    currency: string;
    categories_gl: { name: string } | null;
    accounts: { name: string } | null;
}

function formatter(locale: "es" | "en", currency: string) {
    const language = locale === "en" ? "en-US" : "es-PE";
    return {
        money: new Intl.NumberFormat(language, { style: "currency", currency }),
        moneyCompact: new Intl.NumberFormat(language, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
        }),
        number: new Intl.NumberFormat(language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        percent: new Intl.NumberFormat(language, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }),
        date: new Intl.DateTimeFormat(language, {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }),
        month: new Intl.DateTimeFormat(language, {
            month: "short",
        }),
    };
}

function normalizeMonth(month: string, formatterMonth: Intl.DateTimeFormat) {
    const [year, monthValue] = month.split("-").map(Number);
    return formatterMonth.format(new Date(year, monthValue - 1, 1));
}

function cycleStepStatus(index: number, summary: { accounts: number; categories: number; budgetsMonth: number; transactions12m: number }) {
    if (index === 0) return summary.accounts > 0 && summary.categories > 0;
    if (index === 1) return summary.transactions12m > 0;
    if (index === 2) return summary.budgetsMonth > 0;
    return summary.transactions12m > 0;
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
    const cycle = kpiBundle.personalCycle || null;
    const savingsGoals = kpiBundle.savingsGoals || [];

    const recentRows = (recentTransactions as RecentTransactionRow[]).slice(0, 6);

    const monthlyTrend = kpiBundle.monthlyTrend.map((point) => ({
        ...point,
        label: normalizeMonth(point.month, format.month),
        net: point.income - point.expenses,
    }));

    const latestTrend = monthlyTrend.length > 0 ? monthlyTrend[monthlyTrend.length - 1] : null;

    const cycleProgressBase = [
        cycleStepStatus(0, summary),
        cycleStepStatus(1, summary),
        cycleStepStatus(2, summary),
        cycleStepStatus(3, summary),
    ];

    const cycleCompletionPct = Math.round(
        (cycleProgressBase.filter(Boolean).length / cycleProgressBase.length) * 100
    );

    const cycleSteps = [
        {
            title: "Panorama",
            detail: "Validar estructura financiera y salud del flujo",
            status: cycleProgressBase[0],
            href: "/dashboard/settings#estructura-financiera",
        },
        {
            title: "Registrar",
            detail: "Capturar ingresos y egresos reales del periodo",
            status: cycleProgressBase[1],
            href: "/dashboard/transactions/new",
        },
        {
            title: "Controlar",
            detail: "Comparar plan mensual contra ejecución",
            status: cycleProgressBase[2],
            href: "/dashboard/budget",
        },
        {
            title: "Proyectar",
            detail: "Ajustar supuestos y estimar próximo cierre",
            status: cycleProgressBase[3],
            href: "/dashboard/forecast",
        },
    ];

    const checklist = [
        {
            label: "Estructura base",
            detail: "Cuentas + categorías activas",
            done: summary.accounts > 0 && summary.categories > 0,
            href: "/dashboard/settings#estructura-financiera",
        },
        {
            label: "Presupuesto mensual",
            detail: "Topes definidos para el mes",
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

    const emergencyLabel =
        personal && personal.expenseMonthsObserved >= 2
            ? personal.emergencyFundMonths >= 60
                ? "60+ meses"
                : `${format.number.format(personal.emergencyFundMonths)} meses`
            : "Datos insuficientes";

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-400">
                            Ciclo mensual · Panorama operativo
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">
                            Centro de control financiero
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-600">
                            Unifica diagnóstico, registro, control y proyección en un solo flujo.
                            Diseñado para leer rápido y decidir mejor.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                                Registrar movimiento
                            </Link>
                            <Link href="/dashboard/budget" className="btn-secondary text-sm no-underline">
                                Revisar presupuesto
                            </Link>
                            <Link href="/dashboard/settings#estructura-financiera" className="btn-secondary text-sm no-underline">
                                Ajustar configuración
                            </Link>
                        </div>
                    </div>

                    <article className="rounded-2xl border border-[#d9e2f0] bg-[#f7fbff] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Estado del ciclo
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[#0f2233]">{cycleCompletionPct}% completado</p>
                        <div className="mt-3 h-2 w-full rounded-full bg-[#dce6f2]">
                            <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#117068)]"
                                style={{ width: `${cycleCompletionPct}%` }}
                            />
                        </div>
                        <div className="mt-4 grid gap-2 text-xs text-surface-600 sm:grid-cols-2">
                            <div className="rounded-xl border border-[#d9e2f0] bg-white px-3 py-2">
                                <p className="text-surface-500">Cuentas activas</p>
                                <p className="mt-1 text-base font-semibold text-[#0f2233]">{summary.accounts}</p>
                            </div>
                            <div className="rounded-xl border border-[#d9e2f0] bg-white px-3 py-2">
                                <p className="text-surface-500">Categorías activas</p>
                                <p className="mt-1 text-base font-semibold text-[#0f2233]">{summary.categories}</p>
                            </div>
                            <div className="rounded-xl border border-[#d9e2f0] bg-white px-3 py-2">
                                <p className="text-surface-500">Topes mes</p>
                                <p className="mt-1 text-base font-semibold text-[#0f2233]">{summary.budgetsMonth}</p>
                            </div>
                            <div className="rounded-xl border border-[#d9e2f0] bg-white px-3 py-2">
                                <p className="text-surface-500">Movimientos (12m)</p>
                                <p className="mt-1 text-base font-semibold text-[#0f2233]">{summary.transactions12m}</p>
                            </div>
                        </div>
                    </article>
                </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {cycleSteps.map((step, index) => (
                    <Link
                        key={step.title}
                        href={step.href}
                        className={`rounded-2xl border p-4 no-underline transition-colors ${
                            step.status
                                ? "border-[#bfe1d8] bg-[#eef9f5]"
                                : "border-[#d9e2f0] bg-white hover:border-[#b8cde4]"
                        }`}
                    >
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-400">
                            Paso {index + 1}
                        </p>
                        <p className="mt-1 text-base font-semibold text-[#0f2233]">{step.title}</p>
                        <p className="mt-1 text-sm text-surface-600">{step.detail}</p>
                        <p className={`mt-3 text-xs font-semibold ${step.status ? "text-positive-600" : "text-surface-500"}`}>
                            {step.status ? "Configurado" : "Pendiente"}
                        </p>
                    </Link>
                ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {isBusiness ? (
                    <>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">Revenue actual</p>
                            <p className="mt-2 text-3xl font-semibold text-[#0f2233]">
                                {format.moneyCompact.format(kpiBundle.business?.revenue || 0)}
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">EBIT actual</p>
                            <p className={`mt-2 text-3xl font-semibold ${(kpiBundle.business?.operatingIncome || 0) >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                {format.moneyCompact.format(kpiBundle.business?.operatingIncome || 0)}
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">Margen operativo</p>
                            <p className="mt-2 text-3xl font-semibold text-[#0f2233]">
                                {format.percent.format(kpiBundle.business?.operatingMarginPct || 0)}%
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">Forecast EBIT</p>
                            <p className={`mt-2 text-3xl font-semibold ${(kpiBundle.business?.forecastEbit || 0) >= 0 ? "text-[#0f2233]" : "text-negative-600"}`}>
                                {format.moneyCompact.format(kpiBundle.business?.forecastEbit || 0)}
                            </p>
                        </article>
                    </>
                ) : (
                    <>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">Flujo neto mensual</p>
                            <p className={`mt-2 text-3xl font-semibold ${(personal?.netCashFlow || 0) >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                {format.moneyCompact.format(personal?.netCashFlow || 0)}
                            </p>
                            <p className="mt-1 text-xs text-surface-500">Ingreso menos gasto real</p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">Tasa de ahorro</p>
                            <p className={`mt-2 text-3xl font-semibold ${(personal?.savingsRatePct || 0) >= 20 ? "text-positive-600" : "text-warning-600"}`}>
                                {format.percent.format(personal?.savingsRatePct || 0)}%
                            </p>
                            <p className="mt-1 text-xs text-surface-500">Objetivo recomendado: 20%+</p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">Patrimonio neto</p>
                            <p className={`mt-2 text-3xl font-semibold ${(personal?.netWorth || 0) >= 0 ? "text-[#0f2233]" : "text-negative-600"}`}>
                                {format.moneyCompact.format(personal?.netWorth || 0)}
                            </p>
                            <p className="mt-1 text-xs text-surface-500">
                                Activos {format.moneyCompact.format(personal?.assets || 0)} · Pasivos {format.moneyCompact.format(personal?.liabilities || 0)}
                            </p>
                        </article>
                        <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                            <p className="text-xs font-medium text-surface-500">Cobertura emergencia</p>
                            <p className="mt-2 text-3xl font-semibold text-[#0f2233]">{emergencyLabel}</p>
                            <p className="mt-1 text-xs text-surface-500">Basado en gasto promedio observado</p>
                        </article>
                    </>
                )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-semibold text-[#0f2233]">Tendencia de caja (6 meses)</h3>
                            <p className="text-sm text-surface-500">Lectura visual de ingresos, gastos y ritmo del ciclo.</p>
                        </div>
                        {latestTrend ? (
                            <div className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-right">
                                <p className="text-xs text-surface-500">Último neto</p>
                                <p className={`text-sm font-semibold ${latestTrend.net >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                    {format.money.format(latestTrend.net)}
                                </p>
                            </div>
                        ) : null}
                    </div>
                    <CashFlowChart data={kpiBundle.monthlyTrend} currency={kpiBundle.currency} />
                </article>

                <article className="space-y-4">
                    <section className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                        <h3 className="text-base font-semibold text-[#0f2233]">Consumo de presupuesto</h3>
                        <p className="mt-1 text-sm text-surface-500">Control del mes actual en tiempo real.</p>
                        <div className="mt-4">
                            <BudgetRing
                                used={kpiBundle.budgetUsed || 0}
                                total={kpiBundle.budgetTotal || 0}
                                currency={kpiBundle.currency}
                            />
                        </div>
                    </section>

                    {!isBusiness && cycle && (
                        <section className="rounded-2xl border border-[#d9e2f0] bg-[#f7fbff] p-5 shadow-card">
                            <h3 className="text-base font-semibold text-[#0f2233]">Resumen de ciclo actual</h3>
                            <p className="mt-1 text-sm text-surface-500">
                                Inicio día {cycle.cycleDay}. Proyección desde estructura, deuda y ahorro.
                            </p>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-500">Compromiso operativo</span>
                                    <span className="font-semibold text-[#0f2233]">{format.money.format(cycle.operationalCommitment)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-500">Ahorro planificado</span>
                                    <span className="font-semibold text-[#0d4c7a]">-{format.money.format(cycle.plannedSavings)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-500">Tarjetas pago total</span>
                                    <span className="font-semibold text-negative-600">-{format.money.format(cycle.fullCardPayments)}</span>
                                </div>
                                <div className="h-px bg-[#d9e2f0]" />
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#117068]">Saldo libre proyectado</span>
                                    <span className="font-semibold text-[#117068]">{format.money.format(cycle.projectedFreeCash)}</span>
                                </div>
                            </div>
                        </section>
                    )}
                </article>
            </section>

            {!isBusiness && cycle && (
                <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Agenda de eventos del ciclo</h3>
                    <p className="mt-1 text-sm text-surface-500">Fechas clave para ingresos y obligaciones financieras.</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {cycle.incomePaymentDays.map((day, index) => (
                            <article key={`salary-${day}-${index}`} className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-400">Ingreso</p>
                                <p className="mt-1 text-sm font-semibold text-[#0f2233]">Día {day}</p>
                                <p className="mt-1 text-xs text-surface-500">Abono principal del titular</p>
                            </article>
                        ))}
                        {cycle.partnerIncomePaymentDays.map((day, index) => (
                            <article key={`partner-${day}-${index}`} className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-400">Ingreso compartido</p>
                                <p className="mt-1 text-sm font-semibold text-[#0f2233]">Día {day}</p>
                                <p className="mt-1 text-xs text-surface-500">Aporte de pareja o copartícipe</p>
                            </article>
                        ))}
                        {cycle.cardSchedules.map((card) => (
                            <article key={card.name} className="rounded-xl border border-[#f0d6cd] bg-[#fff9f7] p-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-400">Pago de tarjeta</p>
                                <p className="mt-1 text-sm font-semibold text-[#0f2233]">
                                    {card.name} · Día {card.paymentDay}
                                </p>
                                <p className="mt-1 text-xs text-surface-500">
                                    Estrategia {card.strategy === "full" ? "total" : card.strategy === "minimum" ? "mínimo" : "fija"}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-negative-600">
                                    -{format.money.format(card.expectedPayment)}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {savingsGoals.length > 0 && (
                <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Metas de ahorro</h3>
                    <p className="mt-1 text-sm text-surface-500">Seguimiento de avance y aporte mensual objetivo.</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {savingsGoals.map((goal) => {
                            const current = Number(goal.current_amount) || 0;
                            const target = Number(goal.target_amount) || 0;
                            const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

                            return (
                                <article key={goal.id} className="rounded-xl border border-[#d9e2f0] bg-[#fbfdff] p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-[#0f2233]">{goal.name}</p>
                                        <span className="text-xs font-semibold text-[#0d4c7a]">{format.percent.format(progress)}%</span>
                                    </div>
                                    <div className="mt-3 h-2 w-full rounded-full bg-[#e6edf7]">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#0d4c7a,#117068)]"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-surface-500">
                                        <span>Actual {format.money.format(current)}</span>
                                        <span>Meta {format.money.format(target)}</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[#0f2233]">Movimientos recientes</h3>
                        <Link href="/dashboard/transactions" className="text-xs font-semibold text-[#0d4c7a] no-underline hover:text-[#117068]">
                            Ver libro completo →
                        </Link>
                    </div>

                    {recentRows.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-7 text-center text-sm text-surface-500">
                            Todavía no hay transacciones registradas en este workspace.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentRows.map((item) => {
                                const amount = Number(item.amount);
                                const rowCurrency = item.currency || kpiBundle.currency;
                                const value = new Intl.NumberFormat(kpiBundle.locale === "en" ? "en-US" : "es-PE", {
                                    style: "currency",
                                    currency: rowCurrency.toUpperCase(),
                                }).format(Math.abs(amount));

                                return (
                                    <article key={item.id} className="flex items-center gap-3 rounded-xl border border-[#e8eef7] bg-[#fbfdff] px-3 py-2.5">
                                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold ${amount >= 0 ? "bg-[#eef9f5] text-positive-600" : "bg-[#fef2f2] text-negative-600"}`}>
                                            {amount >= 0 ? "↑" : "↓"}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-[#0f2233]">{item.description}</p>
                                            <p className="text-xs text-surface-500">
                                                {item.categories_gl?.name || "Sin categoría"} · {item.accounts?.name || "Sin cuenta"} · {format.date.format(new Date(item.date))}
                                            </p>
                                        </div>
                                        <p className={`text-sm font-semibold ${amount >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                            {amount >= 0 ? "+" : "-"}
                                            {value}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#0f2233]">Checklist de arranque</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Prioriza estos bloques para consolidar el ciclo operativo.
                    </p>
                    <div className="mt-4 space-y-2">
                        {checklist.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex items-start justify-between gap-3 rounded-xl border px-3.5 py-3 no-underline transition-colors ${
                                    item.done
                                        ? "border-[#bfe1d8] bg-[#eef9f5]"
                                        : "border-[#d9e2f0] bg-[#fbfdff] hover:border-[#b8cde4]"
                                }`}
                            >
                                <div>
                                    <p className="text-sm font-semibold text-[#0f2233]">{item.label}</p>
                                    <p className="text-xs text-surface-500">{item.detail}</p>
                                </div>
                                <span className={`text-xs font-semibold ${item.done ? "text-positive-600" : "text-surface-500"}`}>
                                    {item.done ? "Listo" : "Pendiente"}
                                </span>
                            </Link>
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-surface-500">
                        Progreso actual: {checklist.filter((item) => item.done).length}/{checklist.length} bloques operativos.
                    </p>
                </article>
            </section>
        </div>
    );
}

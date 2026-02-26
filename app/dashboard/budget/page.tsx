import Link from "next/link";
import { getBudgetOverview } from "@/app/actions/budgets";
import { getCategories } from "@/app/actions/categories";
import { BudgetCopyForm } from "@/components/budget/BudgetCopyForm";
import { BudgetSetForm } from "@/components/budget/BudgetSetForm";
import { BudgetBars } from "@/components/ui/BudgetBars";
import { ModuleHero } from "@/components/ui/ModuleHero";

function getRecentMonths(count = 6) {
    const current = new Date();
    const months: string[] = [];

    for (let i = 0; i < count; i += 1) {
        const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
    }

    return months;
}

function monthLabel(month: string) {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
        new Date(year, monthNumber - 1, 1)
    );
}

function friendlyCategoryName(name: string) {
    const map: Record<string, string> = {
        Salary: "Salario",
        Freelance: "Freelance",
        Investments: "Inversiones",
        "Rental Income": "Ingreso por alquiler",
        "Other Income": "Otros ingresos",
        Housing: "Vivienda",
        Utilities: "Servicios",
        Groceries: "Alimentación",
        Transportation: "Transporte",
        Healthcare: "Salud",
        Insurance: "Seguros",
        Entertainment: "Entretenimiento",
        Education: "Educación",
        Shopping: "Compras",
        "Debt Payments": "Pago de deuda",
        Taxes: "Impuestos",
        "Savings & Investments": "Ahorro e inversión",
        "Other Expenses": "Otros gastos",
        Revenue: "Ingresos del negocio",
        "Service Revenue": "Ingresos por servicios",
        "Product Revenue": "Ingresos por productos",
        COGS: "Costo de ventas",
        "Raw Materials": "Materia prima",
        "Direct Labor": "Mano de obra directa",
        "Rent & Facilities": "Alquiler e instalaciones",
        Payroll: "Planilla",
        Marketing: "Marketing",
        "Travel & Entertainment": "Viajes y representación",
        Technology: "Tecnología",
        "Income Tax": "Impuesto a la renta",
    };
    return map[name] ?? name;
}

interface BudgetPageProps {
    searchParams: Promise<{ month?: string }>;
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
    const resolvedSearchParams = await searchParams;
    const monthOptions = getRecentMonths(12);
    const month =
        resolvedSearchParams.month && /^\d{4}-\d{2}$/.test(resolvedSearchParams.month)
            ? resolvedSearchParams.month
            : monthOptions[0];

    const [overview, categories] = await Promise.all([
        getBudgetOverview(month),
        getCategories(),
    ]);

    const budgetCategories = (categories || [])
        .filter((category) => !["income", "revenue", "other_income"].includes(category.kind))
        .map((category) => ({ id: category.id, name: friendlyCategoryName(category.name) }));

    const currencyFormatter = new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: overview.currency || "USD",
    });
    const remaining = overview.totalBudget - overview.totalActual;
    const usageRate =
        overview.totalBudget > 0 ? Math.min((overview.totalActual / overview.totalBudget) * 100, 100) : 0;
    const hasBudgetPlan = overview.rows.length > 0;
    const overBudgetCategories = overview.rows.filter((row) => row.actual > row.budget).length;
    const sourceOptions = monthOptions
        .filter((option) => option !== month)
        .map((option) => ({ value: option, label: monthLabel(option) }));
    const chartRows = overview.rows
        .map((row) => ({
            category: friendlyCategoryName(row.category),
            budget: row.budget,
            actual: row.actual,
            progress: row.progress,
        }))
        .sort((a, b) => b.actual - a.actual);
    const profileLabel = overview.orgType === "business" ? "empresa" : "personal";

    return (
        <div className="space-y-6 animate-fade-in">
            <ModuleHero
                eyebrow="Hoy primero · Plan mensual secundario"
                title="Presupuesto fácil por mes"
                description={`Este módulo te ayuda a poner límites por categoría para ${monthLabel(
                    overview.month
                )}, sin confundirlo con tu saldo de hoy.`}
                actions={
                    <>
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            Registrar movimiento
                        </Link>
                        <Link href="/dashboard" className="btn-secondary text-sm no-underline">
                            Volver a Hoy
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Periodo del plan
                        </p>
                        <form className="mt-3 flex items-center gap-2" method="get">
                            <select className="input-field w-full text-sm" name="month" defaultValue={month}>
                                {monthOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {monthLabel(option)}
                                    </option>
                                ))}
                            </select>
                            <button type="submit" className="btn-secondary text-sm">
                                Aplicar
                            </button>
                        </form>

                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">Plan total</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {currencyFormatter.format(overview.totalBudget)}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Gastado</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {currencyFormatter.format(overview.totalActual)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-200">
                                <div
                                    className={`h-full rounded-full transition-all ${
                                        usageRate >= 100 ? "bg-negative-500" : "bg-[#117068]"
                                    }`}
                                    style={{ width: `${usageRate}%` }}
                                />
                            </div>
                            <p className="mt-2 text-xs text-surface-500">
                                Uso del plan: <span className="font-semibold text-[#0f2233]">{Math.round(usageRate)}%</span>
                            </p>
                        </div>
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Plan total del mes</p>
                    <p className="mt-2 text-3xl font-semibold text-[#0f2233]">
                        {currencyFormatter.format(overview.totalBudget)}
                    </p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Gastado registrado</p>
                    <p className="mt-2 text-3xl font-semibold text-[#0f2233]">
                        {currencyFormatter.format(overview.totalActual)}
                    </p>
                </article>
                <article
                    className={`rounded-2xl border p-5 shadow-card ${
                        remaining >= 0 ? "border-[#bfe1d8] bg-[#eef9f5]" : "border-[#f3dec1] bg-[#fff6ea]"
                    }`}
                >
                    <p className="text-xs font-medium text-surface-500">
                        {remaining >= 0 ? "Disponible dentro del plan" : "Exceso sobre el plan"}
                    </p>
                    <p className={`mt-2 text-3xl font-semibold ${remaining >= 0 ? "text-[#117068]" : "text-[#a3462a]"}`}>
                        {currencyFormatter.format(Math.abs(remaining))}
                    </p>
                </article>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Categorías con plan</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">{overview.rows.length}</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Categorías pasadas</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">{overBudgetCategories}</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Perfil activo</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233] capitalize">{profileLabel}</p>
                </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#10283b]">Estado del mes</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        {hasBudgetPlan
                            ? `Ya tienes plan para ${monthLabel(overview.month)}. Puedes ajustarlo por categoría.`
                            : `Todavía no tienes plan para ${monthLabel(
                                  overview.month
                              )}. Puedes copiar un mes anterior o empezar categoría por categoría.`}
                    </p>

                    {!hasBudgetPlan && (
                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-4 text-sm text-surface-600">
                            <p className="font-semibold text-[#0f2233]">Recomendado para comenzar rápido</p>
                            <ol className="mt-2 space-y-1.5">
                                <li>1. Copia el plan del último mes parecido.</li>
                                <li>2. Ajusta solo categorías grandes (vivienda, comida, transporte).</li>
                                <li>3. Registra movimientos y revisa desvíos cada semana.</li>
                            </ol>
                        </div>
                    )}

                    {hasBudgetPlan && (
                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-4 text-sm text-surface-600">
                            <p className="font-semibold text-[#0f2233]">Lectura rápida</p>
                            <p className="mt-1">
                                {overBudgetCategories > 0
                                    ? `${overBudgetCategories} categorías ya pasaron su límite.`
                                    : "No tienes categorías pasadas por ahora."}
                            </p>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            Registrar movimiento
                        </Link>
                        <Link href="/dashboard/categories" className="btn-secondary text-sm no-underline">
                            Revisar categorías
                        </Link>
                    </div>
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#10283b]">Copiar plan entre meses</h3>
                    <p className="mt-1 text-sm text-surface-500">Ideal para pasar el plan de marzo a abril en un paso.</p>
                    <div className="mt-4">
                        <BudgetCopyForm targetMonth={month} sourceOptions={sourceOptions} />
                    </div>

                    <h3 className="mt-6 text-base font-semibold text-[#10283b]">Definir tope por categoría</h3>
                    <p className="mt-1 text-sm text-surface-500">También puedes editar una categoría puntual sin copiar todo.</p>
                    <div className="mt-4">
                        <BudgetSetForm month={month} categories={budgetCategories} />
                    </div>
                </article>
            </section>

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Ejecución por categoría</h3>
                <p className="mt-1 text-sm text-surface-500">Barras comparativas entre límite del plan y gasto real.</p>
                <div className="mt-4">
                    <BudgetBars rows={chartRows} currency={overview.currency || "USD"} />
                </div>
            </section>

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Detalle por categoría</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Tabla completa para revisar límite, gasto y diferencia.
                </p>

                {overview.rows.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                        Aún no tienes categorías con plan en este mes.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-[#d9e2f0]">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-[#f5f9ff]">
                                <tr className="text-left text-surface-500">
                                    <th className="px-4 py-3 font-semibold">Categoría</th>
                                    <th className="px-4 py-3 text-right font-semibold">Límite</th>
                                    <th className="px-4 py-3 text-right font-semibold">Gastado</th>
                                    <th className="px-4 py-3 text-right font-semibold">Diferencia</th>
                                    <th className="px-4 py-3 text-right font-semibold">Uso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200 bg-white">
                                {overview.rows.map((row, index) => {
                                    const rowVariance = row.actual - row.budget;
                                    return (
                                        <tr key={`${row.category}-${index}`}>
                                            <td className="px-4 py-3 font-medium text-[#0f2233]">
                                                {friendlyCategoryName(row.category)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                {currencyFormatter.format(row.budget)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                {currencyFormatter.format(row.actual)}
                                            </td>
                                            <td
                                                className={`px-4 py-3 text-right font-semibold ${
                                                    rowVariance <= 0 ? "text-positive-600" : "text-warning-600"
                                                }`}
                                            >
                                                {rowVariance <= 0 ? "+" : "-"}
                                                {currencyFormatter.format(Math.abs(rowVariance))}
                                            </td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                {Math.round(row.progress)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

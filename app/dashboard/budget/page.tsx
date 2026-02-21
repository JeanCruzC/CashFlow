import { getBudgetOverview } from "@/app/actions/budgets";
import { getCategories } from "@/app/actions/categories";
import { BudgetSetForm } from "@/components/budget/BudgetSetForm";
import { KPICard } from "@/components/ui/KPICard";

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

interface BudgetPageProps {
    searchParams: { month?: string };
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
    const monthOptions = getRecentMonths(12);
    const month =
        searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
            ? searchParams.month
            : monthOptions[0];

    const [overview, categories] = await Promise.all([
        getBudgetOverview(month),
        getCategories(),
    ]);

    const budgetCategories = (categories || [])
        .filter((category) => !["income", "revenue", "other_income"].includes(category.kind))
        .map((category) => ({ id: category.id, name: category.name }));

    const currencyFormatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" });

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                            Planificación
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Budget vs Actual</h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-500">
                            Controla la ejecución mensual contra el presupuesto planificado por categoría.
                        </p>
                    </div>
                    <form className="flex items-center gap-2" method="get">
                        <select className="input-field w-52 text-sm" name="month" defaultValue={month}>
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
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <KPICard
                    label="Presupuesto total"
                    value={currencyFormatter.format(overview.totalBudget)}
                    tooltip={`Monto planificado para ${monthLabel(overview.month)}.`}
                    variant="default"
                />
                <KPICard
                    label="Ejecución real"
                    value={currencyFormatter.format(overview.totalActual)}
                    tooltip={`Monto ejecutado en ${monthLabel(overview.month)}.`}
                    variant="default"
                />
                <KPICard
                    label="Desviación"
                    value={currencyFormatter.format(overview.totalActual - overview.totalBudget)}
                    tooltip="Diferencia entre gasto real y planificado."
                    variant={overview.totalActual <= overview.totalBudget ? "positive" : "warning"}
                />
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Registrar presupuesto</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Ingresa el monto mensual por categoría para medir desviaciones en tiempo real.
                </p>
                <div className="mt-4">
                    <BudgetSetForm month={month} categories={budgetCategories} />
                </div>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Detalle por categoría</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Comparación operativa entre presupuesto y ejecución para {monthLabel(overview.month)}.
                </p>

                {overview.rows.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                        No hay registros de presupuesto para este periodo.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-surface-200">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead className="bg-surface-50">
                                <tr className="border-b border-surface-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Categoría</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Budget</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Actual</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Variance</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Avance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200">
                                {overview.rows.map((row, index) => {
                                    const variance = row.actual - row.budget;
                                    return (
                                        <tr key={`${row.category}-${index}`} className="bg-white">
                                            <td className="px-4 py-3 font-medium text-[#0f2233]">{row.category}</td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                {currencyFormatter.format(row.budget)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-[#0f2233]">
                                                {currencyFormatter.format(row.actual)}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${variance <= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                                {currencyFormatter.format(variance)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-200">
                                                        <div
                                                            className={`h-full rounded-full ${row.progress > 100 ? "bg-negative-500" : row.progress > 90 ? "bg-warning-500" : "bg-positive-500"}`}
                                                            style={{ width: `${Math.min(row.progress, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-10 text-right text-xs text-surface-500">
                                                        {Math.round(row.progress)}%
                                                    </span>
                                                </div>
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

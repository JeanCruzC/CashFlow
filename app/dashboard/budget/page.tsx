import { getBudgetOverview } from "@/app/actions/budgets";
import { getCategories } from "@/app/actions/categories";
import { BudgetSetForm } from "@/components/budget/BudgetSetForm";
import { KPICard } from "@/components/ui/KPICard";

function getRecentMonths(count = 6) {
    const current = new Date();
    const months: string[] = [];

    for (let i = 0; i < count; i += 1) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    return months;
}

function monthLabel(month: string) {
    const [year, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
        new Date(year, m - 1, 1)
    );
}

interface BudgetPageProps {
    searchParams: { month?: string };
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
    const requestedMonth = searchParams.month;
    const monthOptions = getRecentMonths(12);
    const month = requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth)
        ? requestedMonth
        : monthOptions[0];

    const [overview, categories] = await Promise.all([
        getBudgetOverview(month),
        getCategories(),
    ]);

    const budgetCategories = (categories || [])
        .filter((category) => !["income", "revenue", "other_income"].includes(category.kind))
        .map((category) => ({ id: category.id, name: category.name }));

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Presupuesto</h1>
                    <p className="text-muted mt-1">Compara gasto real contra presupuesto mensual</p>
                </div>
                <form className="flex items-center gap-2" method="get">
                    <select className="input-field text-sm w-52" name="month" defaultValue={month}>
                        {monthOptions.map((option) => (
                            <option key={option} value={option}>
                                {monthLabel(option)}
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="btn-secondary text-sm">
                        Ver
                    </button>
                </form>
            </div>

            <div className="mb-6">
                <BudgetSetForm month={month} categories={budgetCategories} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <KPICard
                    label="Presupuesto total"
                    value={`$${overview.totalBudget.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
                    tooltip={`Total planificado para ${monthLabel(overview.month)}.`}
                    variant="default"
                />
                <KPICard
                    label="Gasto total"
                    value={`$${overview.totalActual.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
                    tooltip={`Gasto real acumulado en ${monthLabel(overview.month)}.`}
                    variant="default"
                />
                <KPICard
                    label="Disponible"
                    value={`$${Math.abs(overview.totalRemaining).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
                    tooltip="Monto restante antes de exceder el plan."
                    variant={overview.totalRemaining >= 0 ? "positive" : "negative"}
                />
            </div>

            {overview.rows.length === 0 ? (
                <div className="card p-8 text-center">
                    <p className="text-sm text-muted">No hay datos de presupuesto para {monthLabel(overview.month)}.</p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-surface-50 dark:bg-surface-900/50">
                                <th className="table-header text-left py-3 px-4">Categoría</th>
                                <th className="table-header text-right py-3 px-4">Presupuestado</th>
                                <th className="table-header text-right py-3 px-4">Real</th>
                                <th className="table-header text-right py-3 px-4">Disponible</th>
                                <th className="table-header text-right py-3 px-4 w-40">Avance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {overview.rows.map((row, index) => (
                                <tr key={`${row.category}-${index}`} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                                    <td className="py-3 px-4 font-medium">{row.category}</td>
                                    <td className="py-3 px-4 text-right text-muted">${row.budget.toLocaleString("es-PE")}</td>
                                    <td className="py-3 px-4 text-right font-medium">${row.actual.toLocaleString("es-PE")}</td>
                                    <td className={`py-3 px-4 text-right font-medium ${row.remaining >= 0 ? "text-positive-500" : "text-negative-500"}`}>
                                        {row.remaining >= 0 ? "" : "-"}${Math.abs(row.remaining).toLocaleString("es-PE")}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${row.progress > 100 ? "bg-negative-500" : row.progress > 90 ? "bg-warning-500" : "bg-positive-500"}`}
                                                    style={{ width: `${Math.min(row.progress, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted w-10 text-right">{Math.round(row.progress)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

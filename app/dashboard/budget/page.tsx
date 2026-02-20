import { getBudgetOverview } from "@/app/actions/budgets";
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
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
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

    const overview = await getBudgetOverview(month);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Budget</h1>
                    <p className="text-muted mt-1">Track your spending against plan</p>
                </div>
                <div className="flex items-center gap-2">
                    <form className="flex items-center gap-2" method="get">
                        <select className="input-field text-sm w-52" name="month" defaultValue={month}>
                            {monthOptions.map((option) => (
                                <option key={option} value={option}>
                                    {monthLabel(option)}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="btn-secondary text-sm">
                            View
                        </button>
                    </form>
                    <button className="btn-primary text-sm opacity-60 cursor-not-allowed" disabled>
                        Set Budget (Soon)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <KPICard
                    label="Total Budget"
                    value={`$${overview.totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    tooltip={`Total planned spending for ${monthLabel(overview.month)}.`}
                    variant="default"
                />
                <KPICard
                    label="Total Spent"
                    value={`$${overview.totalActual.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    tooltip={`Total actual spending in ${monthLabel(overview.month)}.`}
                    variant="default"
                />
                <KPICard
                    label="Remaining"
                    value={`$${Math.abs(overview.totalRemaining).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                    tooltip="Amount left before exceeding plan."
                    variant={overview.totalRemaining >= 0 ? "positive" : "negative"}
                />
            </div>

            {overview.rows.length === 0 ? (
                <div className="card p-8 text-center">
                    <p className="text-sm text-muted">No budget data found for {monthLabel(overview.month)}.</p>
                    <p className="text-xs text-muted mt-2">
                        Budget setup UI will be enabled in upcoming iteration.
                    </p>
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-surface-50 dark:bg-surface-900/50">
                                <th className="table-header text-left py-3 px-4">Category</th>
                                <th className="table-header text-right py-3 px-4">Budgeted</th>
                                <th className="table-header text-right py-3 px-4">Actual</th>
                                <th className="table-header text-right py-3 px-4">Remaining</th>
                                <th className="table-header text-right py-3 px-4 w-40">Progress</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {overview.rows.map((row, index) => (
                                <tr key={`${row.category}-${index}`} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                                    <td className="py-3 px-4 font-medium">{row.category}</td>
                                    <td className="py-3 px-4 text-right text-muted">${row.budget.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right font-medium">${row.actual.toLocaleString()}</td>
                                    <td className={`py-3 px-4 text-right font-medium ${row.remaining >= 0 ? "text-positive-500" : "text-negative-500"}`}>
                                        {row.remaining >= 0 ? "" : "-"}${Math.abs(row.remaining).toLocaleString()}
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

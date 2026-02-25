import Link from "next/link";
import { getBudgetOverview } from "@/app/actions/budgets";
import { getCategories } from "@/app/actions/categories";
import { BudgetSetForm } from "@/components/budget/BudgetSetForm";

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
    const variance = overview.totalActual - overview.totalBudget;
    const profileLabel = overview.orgType === "business" ? "empresa" : "personal";

    return (
        <div className="space-y-7 animate-fade-in">
            <section className="rounded-3xl border border-[#d9e2f0] bg-white p-7 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-400">
                            Control mensual
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Presupuesto operativo</h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-600">
                            Define topes por categoría y compáralos contra la ejecución real.
                        </p>
                    </div>
                    <form className="flex items-center gap-2" method="get">
                        <select className="input-field w-56 text-sm" name="month" defaultValue={month}>
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

            <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <article className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Definir tope por categoría</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Perfil {profileLabel}. Mes activo: {monthLabel(overview.month)}.
                    </p>
                    <div className="mt-4">
                        <BudgetSetForm month={month} categories={budgetCategories} />
                    </div>
                </article>

                <article className="rounded-3xl border border-[#d9e2f0] bg-[#f5f9ff] p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Semáforo del mes</h3>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3">
                            <p className="text-xs text-surface-500">Tope total planificado</p>
                            <p className="mt-1 text-xl font-semibold text-[#0f2233]">
                                {currencyFormatter.format(overview.totalBudget)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3">
                            <p className="text-xs text-surface-500">Ejecución registrada</p>
                            <p className="mt-1 text-xl font-semibold text-[#0f2233]">
                                {currencyFormatter.format(overview.totalActual)}
                            </p>
                        </div>
                        <div
                            className={`rounded-xl border px-4 py-3 ${
                                variance <= 0
                                    ? "border-[#bfe1d8] bg-[#eef9f5]"
                                    : "border-[#f3dec1] bg-[#fff6ea]"
                            }`}
                        >
                            <p className="text-xs text-surface-500">
                                {variance <= 0 ? "Margen disponible" : "Exceso sobre plan"}
                            </p>
                            <p
                                className={`mt-1 text-xl font-semibold ${
                                    variance <= 0 ? "text-[#117068]" : "text-[#a3462a]"
                                }`}
                            >
                                {currencyFormatter.format(Math.abs(variance))}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-[#d9e2f0] bg-white p-4">
                        <p className="text-sm font-semibold text-[#0f2233]">Orden recomendado</p>
                        <ol className="mt-2 space-y-1.5 text-sm text-surface-600">
                            <li>1. Define topes para categorías fijas.</li>
                            <li>2. Registra movimientos reales en el mes.</li>
                            <li>3. Revisa desviaciones por categoría y corrige.</li>
                        </ol>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                                Registrar movimiento
                            </Link>
                            <Link href="/dashboard/categories" className="btn-secondary text-sm no-underline">
                                Revisar clasificación
                            </Link>
                        </div>
                    </div>
                </article>
            </section>

            <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Detalle por categoría</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Comparación de presupuesto vs ejecución para {monthLabel(overview.month)}.
                </p>

                {overview.rows.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                        No tienes topes configurados para este mes.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-[#d9e2f0]">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-[#f5f9ff]">
                                <tr className="text-left text-surface-500">
                                    <th className="px-4 py-3 font-semibold">Categoría</th>
                                    <th className="px-4 py-3 text-right font-semibold">Tope</th>
                                    <th className="px-4 py-3 text-right font-semibold">Ejecución</th>
                                    <th className="px-4 py-3 text-right font-semibold">Desviación</th>
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

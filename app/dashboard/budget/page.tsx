import { getBudgetOverview } from "@/app/actions/budgets";
import { getCategories } from "@/app/actions/categories";
import { BudgetSetForm } from "@/components/budget/BudgetSetForm";
import Link from "next/link";

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
        Freelance: "Trabajo freelance",
        Investments: "Inversiones",
        "Rental Income": "Ingresos por alquiler",
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
        "Debt Payments": "Pago de deudas",
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

    const currencyFormatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: overview.currency || "USD" });
    const variance = overview.totalActual - overview.totalBudget;
    const budgetConfigured = overview.totalBudget > 0;
    const statusLabel = !budgetConfigured
        ? "Aún no configurado"
        : variance <= 0
            ? "Vas dentro del plan"
            : "Te pasaste del plan";
    const statusColor = !budgetConfigured
        ? "text-[#6a6f88] bg-[#f3f4fb] border-[#d9dcec]"
        : variance <= 0
            ? "text-[#117068] bg-[#edf9f6] border-[#bedfd8]"
            : "text-[#a3462a] bg-[#fff4eb] border-[#f4d5bf]";
    const profileLabel = overview.orgType === "business" ? "empresa" : "personal";

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
                            En simple: define cuánto puedes gastar este mes y compara contra lo que ya gastaste.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}>
                                {statusLabel}
                            </span>
                            <span className="text-xs text-surface-500">
                                Perfil {profileLabel} · {monthLabel(overview.month)}
                            </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link href="/dashboard/categories" className="btn-secondary text-sm no-underline">
                                1) Revisar clasificación
                            </Link>
                            <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                                2) Registrar gasto/ingreso
                            </Link>
                        </div>
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
                <article className="rounded-2xl border border-[#b8d8f0] bg-[#edf6fd] p-4 shadow-card">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0d4c7a]">Tu meta del mes</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">{currencyFormatter.format(overview.totalBudget)}</p>
                    <p className="mt-1 text-xs text-surface-600">Es el tope que te propusiste gastar.</p>
                </article>
                <article className="rounded-2xl border border-[#bedfd8] bg-[#edf9f6] p-4 shadow-card">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#117068]">Ya gastaste</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">{currencyFormatter.format(overview.totalActual)}</p>
                    <p className="mt-1 text-xs text-surface-600">Se actualiza con tus movimientos registrados.</p>
                </article>
                <article className={`rounded-2xl border p-4 shadow-card ${variance <= 0 ? "border-[#bedfd8] bg-[#edf9f6]" : "border-[#f4d5bf] bg-[#fff4eb]"}`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${variance <= 0 ? "text-[#117068]" : "text-[#a3462a]"}`}>
                        {variance <= 0 ? "Te sobra" : "Te pasaste"}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">{currencyFormatter.format(Math.abs(variance))}</p>
                    <p className="mt-1 text-xs text-surface-600">
                        {variance <= 0
                            ? "Mantienes margen dentro de tu plan."
                            : "Gasto por encima del presupuesto del mes."}
                    </p>
                </article>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Definir tope por categoría</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Paso simple: elige una categoría y define el máximo que quieres gastar este mes.
                </p>
                <div className="mt-4">
                    <BudgetSetForm month={month} categories={budgetCategories} />
                </div>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Cómo vas por categoría</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Comparación de tu plan vs lo realmente gastado para {monthLabel(overview.month)}.
                </p>

                {overview.rows.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                        No tienes topes configurados para este mes. Empieza arriba en “Definir tope por categoría”.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-surface-200">
                        <table className="w-full min-w-[720px] text-sm">
                            <thead className="bg-surface-50">
                                <tr className="border-b border-surface-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-500">Categoría / rubro</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Tope mensual</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Gastado</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Diferencia</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-500">Nivel de uso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200">
                                {overview.rows.map((row, index) => {
                                    const variance = row.actual - row.budget;
                                    return (
                                        <tr key={`${row.category}-${index}`} className={variance > 0 ? "bg-[#fffaf5]" : "bg-white"}>
                                            <td className="px-4 py-3 font-medium text-[#0f2233]">{friendlyCategoryName(row.category)}</td>
                                            <td className="px-4 py-3 text-right text-surface-600">
                                                {currencyFormatter.format(row.budget)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-[#0f2233]">
                                                {currencyFormatter.format(row.actual)}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${variance <= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                                {variance <= 0 ? "+" : "-"}{currencyFormatter.format(Math.abs(variance))}
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

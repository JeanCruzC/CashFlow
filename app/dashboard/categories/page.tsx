import { getCategories } from "@/app/actions/categories";
import { CategoryCreateForm } from "@/components/categories/CategoryCreateForm";
import { CategoryGL } from "@/lib/types/finance";

const KIND_ORDER = [
    "income",
    "expense",
    "transfer",
    "revenue",
    "cogs",
    "opex",
    "other_income",
    "other_expense",
    "tax",
];

function normalizeKindLabel(kind: string) {
    const labels: Record<string, string> = {
        income: "Income",
        expense: "Expense",
        transfer: "Transfer",
        revenue: "Revenue",
        cogs: "COGS",
        opex: "OPEX",
        other_income: "Other Income",
        other_expense: "Other Expense",
        tax: "Tax",
    };

    return labels[kind] ?? kind.replaceAll("_", " ");
}

function groupColor(kind: string) {
    if (kind === "income" || kind === "revenue" || kind === "other_income") return "bg-positive-500";
    if (kind === "transfer") return "bg-[#0d4c7a]";
    if (kind === "cogs") return "bg-warning-500";
    if (kind === "tax") return "bg-[#0f6e9f]";
    return "bg-negative-500";
}

export default async function CategoriesPage() {
    const categories = (await getCategories()) as CategoryGL[];

    const grouped = categories.reduce<Record<string, CategoryGL[]>>((acc, category) => {
        if (!acc[category.kind]) acc[category.kind] = [];
        acc[category.kind].push(category);
        return acc;
    }, {});

    const sortedKinds = Object.keys(grouped).sort((a, b) => {
        const indexA = KIND_ORDER.indexOf(a);
        const indexB = KIND_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">Clasificación</p>
                <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Categorías y GL</h2>
                <p className="mt-2 max-w-3xl text-sm text-surface-500">
                    Estandariza tu plan de cuentas para reportes consistentes en Budget, Forecast y
                    análisis operativo de ingresos, costos y gastos.
                </p>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Agregar clasificación</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Crea categorías personalizadas y marca costos fijos/variables cuando aplique.
                </p>
                <div className="mt-4">
                    <CategoryCreateForm />
                </div>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Estructura actual</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Agrupación por tipo financiero para una lectura rápida de la clasificación activa.
                </p>

                {categories.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                        No hay categorías activas.
                    </div>
                ) : (
                    <div className="mt-5 space-y-5">
                        {sortedKinds.map((kind) => (
                            <div key={kind}>
                                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">
                                    {normalizeKindLabel(kind)}
                                </h4>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {grouped[kind].map((category) => (
                                        <div
                                            key={category.id}
                                            className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-3 py-2.5"
                                        >
                                            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#0f2233]">
                                                <span className={`h-2 w-2 rounded-full ${groupColor(kind)}`} />
                                                {category.name}
                                            </span>
                                            {kind === "opex" ? (
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                                                    {category.fixed_cost ? "Fixed" : category.variable_cost ? "Variable" : "Opex"}
                                                </span>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

import Link from "next/link";
import { getCategories, getOrgType } from "@/app/actions/categories";
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

const PERSONAL_KINDS = new Set(["income", "expense", "transfer"]);
const BUSINESS_KINDS = new Set(["revenue", "cogs", "opex", "other_income", "other_expense", "tax", "transfer"]);

function kindLabel(kind: string) {
    const labels: Record<string, string> = {
        income: "Ingresos",
        expense: "Gastos",
        transfer: "Transferencias",
        revenue: "Ingresos del negocio",
        cogs: "Costo de ventas (COGS)",
        opex: "Gastos operativos (OPEX)",
        other_income: "Otros ingresos",
        other_expense: "Otros gastos",
        tax: "Impuestos",
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
    const [categories, orgType] = await Promise.all([
        getCategories() as Promise<CategoryGL[]>,
        getOrgType(),
    ]);

    const allowedKinds = orgType === "business" ? BUSINESS_KINDS : PERSONAL_KINDS;

    const grouped = categories
        .filter((c) => allowedKinds.has(c.kind))
        .reduce<Record<string, CategoryGL[]>>((acc, category) => {
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
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold text-[#0f2233]">Categorías</h2>
                        <p className="mt-1 text-sm text-surface-500">
                            Cada movimiento se etiqueta con una categoría. Esto alimenta tu resumen y presupuesto.
                        </p>
                    </div>
                    <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                        Registrar movimiento
                    </Link>
                </div>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Agregar categoría</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Si necesitas una categoría nueva, créala aquí.
                </p>
                <div className="mt-4">
                    <CategoryCreateForm />
                </div>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Tus categorías activas</h3>

                {Object.keys(grouped).length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-6 text-sm text-surface-500">
                        No hay categorías activas.
                    </div>
                ) : (
                    <div className="mt-5 space-y-5">
                        {sortedKinds.map((kind) => (
                            <div key={kind}>
                                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">
                                    {kindLabel(kind)}
                                </h4>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {grouped[kind].map((category) => (
                                        <div
                                            key={category.id}
                                            className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-3 py-2.5 shadow-sm"
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

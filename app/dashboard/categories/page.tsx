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
        income: "Ingreso",
        expense: "Gasto",
        transfer: "Transferencia",
        revenue: "Ingreso de negocio",
        cogs: "Costo de ventas",
        opex: "Gasto operativo",
        other_income: "Otros ingresos",
        other_expense: "Otros gastos",
        tax: "Impuestos",
    };

    return labels[kind] ?? kind.replaceAll("_", " ");
}

export default async function CategoriesPage() {
    const categories = (await getCategories()) as CategoryGL[];

    const grouped = categories.reduce<Record<string, CategoryGL[]>>((acc, category) => {
        if (!acc[category.kind]) acc[category.kind] = [];
        acc[category.kind].push(category);
        return acc;
    }, {});

    const sortedKinds = Object.keys(grouped).sort((a, b) => {
        const aIndex = KIND_ORDER.indexOf(a);
        const bIndex = KIND_ORDER.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Categorías</h1>
                    <p className="text-muted mt-1">Define y organiza la clasificación de tus movimientos</p>
                </div>
            </div>

            <div className="mb-6">
                <CategoryCreateForm />
            </div>

            {categories.length === 0 ? (
                <div className="card p-8 text-center">
                    <p className="text-sm text-muted">No hay categorías activas.</p>
                </div>
            ) : (
                sortedKinds.map((kind) => (
                    <div key={kind} className="mb-6">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3 capitalize">
                            {normalizeKindLabel(kind)}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {grouped[kind].map((category) => (
                                <div
                                    key={category.id}
                                    className="card p-3 flex items-center gap-2"
                                >
                                    <div
                                        className={`w-2 h-2 rounded-full ${kind === "income" || kind === "revenue"
                                                ? "bg-positive-500"
                                                : kind === "transfer"
                                                    ? "bg-brand-500"
                                                    : "bg-negative-500"
                                            }`}
                                    />
                                    <span className="text-sm font-medium">{category.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

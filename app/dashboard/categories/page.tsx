import Link from "next/link";
import { getCategories, getOrgType } from "@/app/actions/categories";
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
const BUSINESS_KINDS = new Set([
    "revenue",
    "cogs",
    "opex",
    "other_income",
    "other_expense",
    "tax",
    "transfer",
]);

function kindLabel(kind: string) {
    const labels: Record<string, string> = {
        income: "Ingresos",
        expense: "Gastos",
        transfer: "Transferencias",
        revenue: "Revenue",
        cogs: "COGS",
        opex: "OPEX",
        other_income: "Otros ingresos",
        other_expense: "Otros gastos",
        tax: "Impuestos",
    };
    return labels[kind] ?? kind;
}

function groupTone(kind: string) {
    if (kind === "income" || kind === "revenue" || kind === "other_income") {
        return "border-[#bfe1d8] bg-[#eef9f5]";
    }
    if (kind === "transfer") {
        return "border-[#c5d7ef] bg-[#eef4fc]";
    }
    if (kind === "cogs" || kind === "tax") {
        return "border-[#f3dec1] bg-[#fff6ea]";
    }
    return "border-[#f0d2c3] bg-[#fff4ef]";
}

export default async function CategoriesPage() {
    const [categories, orgType] = await Promise.all([
        getCategories() as Promise<CategoryGL[]>,
        getOrgType(),
    ]);

    const allowedKinds = orgType === "business" ? BUSINESS_KINDS : PERSONAL_KINDS;
    const grouped = categories
        .filter((category) => allowedKinds.has(category.kind))
        .reduce<Record<string, CategoryGL[]>>((acc, category) => {
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

    const totalCategories = sortedKinds.reduce(
        (sum, kind) => sum + grouped[kind].length,
        0
    );

    return (
        <div className="space-y-7 animate-fade-in">
            <section className="rounded-3xl border border-[#d9e2f0] bg-white p-7 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-400">
                            Estructura contable
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Clasificación financiera</h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-600">
                            Cada movimiento necesita una clasificación clara para que presupuesto, reportes y forecast tengan sentido.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/dashboard/settings#estructura-financiera"
                            className="btn-secondary text-sm no-underline"
                        >
                            Administrar categorías
                        </Link>
                        <Link
                            href="/dashboard/transactions/new"
                            className="btn-primary text-sm no-underline hover:text-white"
                        >
                            Registrar movimiento
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Tipo de workspace</p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2233]">
                        {orgType === "business" ? "Empresa" : "Personal"}
                    </p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Grupos activos</p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2233]">{sortedKinds.length}</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Categorías activas</p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2233]">{totalCategories}</p>
                </article>
            </section>

            {sortedKinds.length === 0 ? (
                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                        No hay categorías activas en este workspace.
                    </div>
                </section>
            ) : (
                <section className="grid gap-4 xl:grid-cols-3">
                    {sortedKinds.map((kind) => (
                        <article
                            key={kind}
                            className={`rounded-2xl border p-5 shadow-card ${groupTone(kind)}`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-base font-semibold text-[#0f2233]">
                                    {kindLabel(kind)}
                                </h3>
                                <span className="rounded-full border border-[#d9e2f0] bg-white px-2 py-1 text-xs font-semibold text-surface-500">
                                    {grouped[kind].length}
                                </span>
                            </div>

                            <div className="mt-3 space-y-2">
                                {grouped[kind]
                                    .slice()
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map((category) => (
                                        <div
                                            key={category.id}
                                            className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2 text-sm"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium text-[#0f2233]">{category.name}</span>
                                                {kind === "opex" ? (
                                                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500">
                                                        {category.fixed_cost
                                                            ? "Fijo"
                                                            : category.variable_cost
                                                              ? "Variable"
                                                              : "Opex"}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </div>
    );
}

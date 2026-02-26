import Link from "next/link";
import { getCategories, getOrgType } from "@/app/actions/categories";
import { ModuleHero } from "@/components/ui/ModuleHero";
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
        return "border-[#c9e6de] bg-[#f2faf7]";
    }
    if (kind === "transfer") {
        return "border-[#d2e0f2] bg-[#f3f8fd]";
    }
    if (kind === "cogs" || kind === "tax") {
        return "border-[#f1dfc8] bg-[#fff9ef]";
    }
    return "border-[#f0d9d0] bg-[#fff8f5]";
}

function groupHint(kind: string) {
    if (kind === "income" || kind === "revenue" || kind === "other_income") {
        return "Entradas que incrementan caja.";
    }
    if (kind === "transfer") {
        return "Movimiento entre cuentas, sin impacto neto.";
    }
    if (kind === "cogs") {
        return "Costos directos del negocio.";
    }
    if (kind === "tax") {
        return "Obligaciones tributarias.";
    }
    if (kind === "opex") {
        return "Gastos de operación del negocio.";
    }
    return "Salidas operativas del flujo.";
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

    const topKinds = sortedKinds
        .map((kind) => ({ kind, count: grouped[kind].length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

    return (
        <div className="space-y-6 animate-fade-in">
            <ModuleHero
                eyebrow="Configuracion · Categorias"
                title="Clasificacion de movimientos"
                description="Ordena tus categorias para que cada registro por fecha quede claro y bien clasificado."
                actions={
                    <>
                        <Link href="/dashboard/settings#estructura-financiera" className="btn-secondary text-sm no-underline">
                            Administrar categorias
                        </Link>
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            Registrar movimiento
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Estado de clasificacion
                        </p>
                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">Workspace</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {orgType === "business" ? "Empresa" : "Personal"}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Grupos activos</span>
                                <span className="font-semibold text-[#0f2233]">{sortedKinds.length}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Categorias activas</span>
                                <span className="font-semibold text-[#0f2233]">{totalCategories}</span>
                            </div>
                        </div>
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Tipo de workspace</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">
                        {orgType === "business" ? "Empresa" : "Personal"}
                    </p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Grupos activos</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">{sortedKinds.length}</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Categorías activas</p>
                    <p className="mt-2 text-2xl font-semibold text-[#0f2233]">{totalCategories}</p>
                </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#10283b]">Mapa por grupos</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Cada grupo define cómo se interpreta un movimiento en el flujo.
                    </p>

                    {sortedKinds.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                            No hay categorías activas en este workspace.
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {sortedKinds.map((kind) => (
                                <article
                                    key={kind}
                                    className={`rounded-xl border p-4 ${groupTone(kind)}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="text-sm font-semibold text-[#0f2233]">{kindLabel(kind)}</h4>
                                            <p className="mt-0.5 text-xs text-surface-500">{groupHint(kind)}</p>
                                        </div>
                                        <span className="rounded-full border border-[#d9e2f0] bg-white px-2 py-0.5 text-[11px] font-semibold text-surface-500">
                                            {grouped[kind].length}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {grouped[kind]
                                            .slice()
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((category) => (
                                                <span
                                                    key={category.id}
                                                    className="rounded-full border border-[#d9e2f0] bg-white px-2.5 py-1 text-xs font-medium text-[#0f2233]"
                                                >
                                                    {category.name}
                                                </span>
                                            ))}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </article>

                <article className="space-y-4">
                    <section className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                        <h3 className="text-base font-semibold text-[#10283b]">Prioridad de revisión</h3>
                        <p className="mt-1 text-sm text-surface-500">
                            Grupos con más categorías, donde suelen aparecer duplicados.
                        </p>
                        {topKinds.length === 0 ? (
                            <p className="mt-4 text-sm text-surface-500">Sin datos para analizar.</p>
                        ) : (
                            <div className="mt-4 space-y-2.5">
                                {topKinds.map((item, index) => (
                                    <div key={item.kind} className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-3.5 py-3">
                                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-400">
                                            #{index + 1}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-[#0f2233]">
                                            {kindLabel(item.kind)}
                                        </p>
                                        <p className="text-xs text-surface-500">{item.count} categorías</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                        <h3 className="text-base font-semibold text-[#10283b]">Buenas prácticas</h3>
                        <ul className="mt-3 space-y-2 text-sm text-surface-600">
                            <li>1. Evita categorías duplicadas con nombres similares.</li>
                            <li>2. Usa categorías específicas para gastos relevantes.</li>
                            <li>3. Revisa mensualmente las categorías sin uso.</li>
                            <li>4. Si cambia tu operación, ajusta la estructura en Configuración.</li>
                        </ul>
                    </section>
                </article>
            </section>
        </div>
    );
}

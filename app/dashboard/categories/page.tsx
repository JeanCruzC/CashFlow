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

function groupColor(kind: string) {
    if (kind === "income" || kind === "revenue" || kind === "other_income") {
        return { border: "rgba(0,184,122,.18)", bg: "linear-gradient(145deg,#f0fdf8,#fff)", color: "var(--ok)", tagBorder: "rgba(0,184,122,.2)" };
    }
    if (kind === "transfer") {
        return { border: "var(--brd)", bg: "var(--srf)", color: "var(--tx)", tagBorder: "var(--brd)" };
    }
    if (kind === "cogs" || kind === "tax") {
        return { border: "rgba(255,165,2,.18)", bg: "linear-gradient(145deg,#fffbf2,#fff)", color: "var(--wa)", tagBorder: "rgba(255,165,2,.2)" };
    }
    return { border: "rgba(245,54,92,.15)", bg: "linear-gradient(145deg,#fff8f9,#fff)", color: "var(--ng)", tagBorder: "rgba(245,54,92,.15)" };
}

function groupHint(kind: string) {
    if (kind === "income" || kind === "revenue" || kind === "other_income") return "Entradas que incrementan caja";
    if (kind === "transfer") return "Movimiento entre cuentas, sin impacto neto";
    if (kind === "cogs") return "Costos directos del negocio";
    if (kind === "tax") return "Obligaciones tributarias";
    if (kind === "opex") return "Gastos de operación del negocio";
    return "Salidas operativas del flujo";
}

function categoryProfileLabel(category: CategoryGL) {
    if (category.fixed_cost && category.variable_cost) return "Mixto";
    if (category.fixed_cost) return "Fijo";
    if (category.variable_cost) return "Variable";
    return "General";
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

    const priorityColors = ["var(--ng-l)", "var(--ok-l)", "var(--acc-l)"];
    const priorityTextColors = ["var(--ng)", "var(--ok)", "var(--acc)"];

    return (
        <div className="min-h-screen">
            <ModuleHero
                eyebrow="CONFIGURACIÓN · CATEGORÍAS"
                title="Clasificación de movimientos"
                description="Ordena tus categorías para que cada registro quede claro"
                actions={
                    <>
                        <Link href="/dashboard/settings#estructura-financiera" className="h-btn1 no-underline">
                            Administrar categorías
                        </Link>
                        <Link href="/dashboard/transactions/new" className="h-btn2 no-underline">
                            Registrar movimiento
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <div className="h-stat"><div className="h-stat-lbl">Workspace</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{orgType === "business" ? "Empresa" : "Personal"}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl">Grupos activos</div><div className="h-stat-n" style={{ color: "#5effd5" }}>{sortedKinds.length}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl">Categorías activas</div><div className="h-stat-n" style={{ color: "#5effd5" }}>{totalCategories}</div></div>
                    </>
                }
            />

            {/* Category Groups + Sidebar */}
            <div className="g2 fu in" style={{ transitionDelay: ".06s" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {sortedKinds.length === 0 ? (
                        <div className="card"><div className="table-empty">No hay categorías activas en este workspace.</div></div>
                    ) : (
                        sortedKinds.map((kind) => {
                            const colors = groupColor(kind);
                            return (
                                <div key={kind} className="cat-group" style={{ borderColor: colors.border, background: colors.bg }}>
                                    <div className="card-head">
                                        <div>
                                            <div className="cat-group-name" style={{ color: colors.color }}>
                                                {kindLabel(kind)} <span className="cat-count">{grouped[kind].length}</span>
                                            </div>
                                            <div className="cat-group-desc">{groupHint(kind)}</div>
                                        </div>
                                    </div>
                                    <div className="cat-tags">
                                        {grouped[kind]
                                            .slice()
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((category) => (
                                                <span key={category.id} className="cat-tag" style={{ borderColor: colors.tagBorder }}>
                                                    {category.name}
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div className="card">
                        <div className="card-head"><div className="card-title">Prioridad de revisión</div></div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {topKinds.map((item, index) => (
                                <div key={item.kind} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "var(--srf2)", border: "1px solid var(--brd)", borderRadius: "var(--r2)" }}>
                                    <div style={{ width: "24px", height: "24px", background: priorityColors[index], borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: priorityTextColors[index] }}>{index + 1}</div>
                                    <div>
                                        <div style={{ fontSize: "13px", fontWeight: 700 }}>{kindLabel(item.kind)}</div>
                                        <div style={{ fontSize: "11px", color: "var(--tx2)" }}>{item.count} categorías</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-head"><div className="card-title">Buenas prácticas</div></div>
                        <div className="rec-actions-grid" style={{ marginTop: 0 }}>
                            <div className="rec-action">Evita categorías duplicadas con nombres similares.</div>
                            <div className="rec-action">Usa categorías específicas para gastos relevantes.</div>
                            <div className="rec-action">Revisa mensualmente las categorías sin uso.</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="table-wrap fu in" style={{ transitionDelay: ".12s" }}>
                <table className="table-v">
                    <thead><tr><th>CATEGORÍA</th><th>GRUPO</th><th>PERFIL</th><th>ESTADO</th></tr></thead>
                    <tbody>
                        {sortedKinds.flatMap((kind) =>
                            grouped[kind]
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((category) => (
                                    <tr key={category.id}>
                                        <td style={{ fontWeight: 700 }}>{category.name}</td>
                                        <td style={{ color: "var(--tx2)" }}>{kindLabel(category.kind)}</td>
                                        <td><span className="ptag if">{categoryProfileLabel(category)}</span></td>
                                        <td><span className="ptag sg">{category.is_active ? "ACTIVA" : "INACTIVA"}</span></td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

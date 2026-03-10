import Link from "next/link";
import { getBudgetOverview } from "@/app/actions/budgets";
import { getCategories } from "@/app/actions/categories";
import { BudgetCopyForm } from "@/components/budget/BudgetCopyForm";
import { BudgetSetForm } from "@/components/budget/BudgetSetForm";
import { BudgetBars } from "@/components/ui/BudgetBars";
import { ModuleHero } from "@/components/ui/ModuleHero";

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
        Salary: "Salario", Freelance: "Freelance", Investments: "Inversiones",
        "Rental Income": "Ingreso por alquiler", "Other Income": "Otros ingresos",
        Housing: "Vivienda", Utilities: "Servicios", Groceries: "Alimentación",
        Transportation: "Transporte", Healthcare: "Salud", Insurance: "Seguros",
        Entertainment: "Entretenimiento", Education: "Educación", Shopping: "Compras",
        "Debt Payments": "Pago de deuda", Taxes: "Impuestos",
        "Savings & Investments": "Ahorro e inversión", "Other Expenses": "Otros gastos",
        Revenue: "Ingresos del negocio", "Service Revenue": "Ingresos por servicios",
        "Product Revenue": "Ingresos por productos", COGS: "Costo de ventas",
        "Raw Materials": "Materia prima", "Direct Labor": "Mano de obra directa",
        "Rent & Facilities": "Alquiler e instalaciones", Payroll: "Planilla",
        Marketing: "Marketing", "Travel & Entertainment": "Viajes y representación",
        Technology: "Tecnología", "Income Tax": "Impuesto a la renta",
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
    const remaining = overview.totalBudget - overview.totalActual;
    const usageRate =
        overview.totalBudget > 0 ? Math.min((overview.totalActual / overview.totalBudget) * 100, 100) : 0;
    const hasBudgetPlan = overview.rows.length > 0;
    const overBudgetCategories = overview.rows.filter((row) => row.actual > row.budget).length;
    const sourceOptions = monthOptions
        .filter((option) => option !== month)
        .map((option) => ({ value: option, label: monthLabel(option) }));
    const chartRows = overview.rows
        .map((row) => ({
            category: friendlyCategoryName(row.category),
            budget: row.budget,
            actual: row.actual,
            progress: row.progress,
        }))
        .sort((a, b) => b.actual - a.actual);

    return (
        <div className="min-h-screen">
            <ModuleHero
                eyebrow={`PLAN MENSUAL · ${monthLabel(month).toUpperCase()}`}
                title="Presupuesto fácil por mes"
                description="Define topes por categoría y compara contra lo real"
                actions={
                    <>
                        <Link href="/dashboard/transactions/new" className="h-btn1 no-underline">
                            Registrar movimiento
                        </Link>
                        <Link href="/dashboard" className="h-btn2 no-underline">
                            Volver a Hoy
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <div className="h-stat"><div className="h-stat-lbl">Plan total</div><div className="h-stat-n" style={{ color: "#fff" }}>{currencyFormatter.format(overview.totalBudget)}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl">Gastado</div><div className="h-stat-n" style={{ color: "#fff" }}>{currencyFormatter.format(overview.totalActual)}</div></div>
                        <div className="h-stat">
                            <div className="h-stat-lbl">Uso del plan</div>
                            <div style={{ height: "6px", background: "rgba(255,255,255,.15)", borderRadius: "99px", marginTop: "6px", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${usageRate}%`, background: usageRate >= 100 ? "var(--ng)" : "#fff", borderRadius: "99px", transition: "width 1.5s cubic-bezier(.4,0,.2,1)" }}></div>
                            </div>
                        </div>
                    </>
                }
            />

            {/* Stat Cards */}
            <div className="g3 fu in" style={{ transitionDelay: ".06s" }}>
                <div className="stat-card"><div className="stat-badge sb-info">Informativo</div><div className="stat-n">{currencyFormatter.format(overview.totalBudget)}</div><div className="stat-desc">Plan total del mes — suma de límites por categoría. No es tu saldo.</div></div>
                <div className="stat-card"><div className="stat-badge sb-ok">Informativo</div><div className="stat-n ok">{currencyFormatter.format(overview.totalActual)}</div><div className="stat-desc">Gastado registrado — movimientos clasificados este mes.</div></div>
                <div className="stat-card"><div className="stat-badge sb-wa">Seguimiento</div><div className={`stat-n ${remaining >= 0 ? "a" : "ng"}`}>{currencyFormatter.format(Math.abs(remaining))}</div><div className="stat-desc">{remaining >= 0 ? "Disponible dentro del plan — vas bajo el límite total." : "Exceso sobre el plan — ya superaste el límite."}</div></div>
            </div>

            {/* Status + Copy form */}
            <div className="g2 fu in" style={{ transitionDelay: ".1s" }}>
                <div className="card">
                    <div className="card-head"><div><div className="card-title">Estado del mes</div><div className="card-sub">{hasBudgetPlan ? `Plan activo para ${monthLabel(overview.month)}` : `Sin plan para ${monthLabel(overview.month)} aún`}</div></div></div>

                    {!hasBudgetPlan && (
                        <div style={{ background: "var(--srf2)", border: "1px solid var(--brd)", borderRadius: "var(--r2)", padding: "16px", marginBottom: "14px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>Empieza rápido</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{ fontSize: "12.5px", color: "var(--tx2)", padding: "7px 0", borderBottom: "1px solid var(--brd)" }}>1. Copia el plan del último mes parecido.</div>
                                <div style={{ fontSize: "12.5px", color: "var(--tx2)", padding: "7px 0", borderBottom: "1px solid var(--brd)" }}>2. Ajusta categorías grandes (vivienda, comida, transporte).</div>
                                <div style={{ fontSize: "12.5px", color: "var(--tx2)", padding: "7px 0" }}>3. Registra movimientos y revisa desviaciones cada semana.</div>
                            </div>
                        </div>
                    )}

                    {hasBudgetPlan && (
                        <div style={{ background: "var(--srf2)", border: "1px solid var(--brd)", borderRadius: "var(--r2)", padding: "16px", marginBottom: "14px" }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>Lectura rápida</div>
                            <div style={{ fontSize: "12.5px", color: "var(--tx2)" }}>
                                {overBudgetCategories > 0
                                    ? `${overBudgetCategories} categorías ya pasaron su límite.`
                                    : "No tienes categorías pasadas por ahora."}
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "8px" }}>
                        <Link href="/dashboard/transactions/new" className="plan-btn no-underline" style={{ flex: 1 }}>Registrar movimiento</Link>
                        <Link href="/dashboard/categories" className="plan-btn no-underline" style={{ flex: 1, background: "var(--srf2)", color: "var(--tx)", boxShadow: "none", border: "1px solid var(--brd)" }}>Revisar categorías</Link>
                    </div>
                </div>

                <div className="card">
                    <div className="card-head"><div><div className="card-title">Copiar plan entre meses</div><div className="card-sub">Pasa el plan de un mes a otro en un paso</div></div></div>
                    <BudgetCopyForm targetMonth={month} sourceOptions={sourceOptions} />

                    <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--brd)" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Definir tope por categoría</div>
                        <div style={{ fontSize: "12px", color: "var(--tx2)", marginBottom: "10px" }}>Añade límites individuales para controlar cada rubro mensual.</div>
                        <BudgetSetForm month={month} categories={budgetCategories} />
                    </div>
                </div>
            </div>

            {/* Budget Bars Chart */}
            {hasBudgetPlan && (
                <div className="card fu in" style={{ transitionDelay: ".15s" }}>
                    <div className="card-head"><div><div className="card-title">Ejecución por categoría</div><div className="card-sub">Barras comparativas entre límite y gasto real</div></div></div>
                    <BudgetBars rows={chartRows} currency={overview.currency || "USD"} />
                </div>
            )}

            {/* Detail Table */}
            <div className="table-wrap fu in" style={{ transitionDelay: ".2s" }}>
                {overview.rows.length === 0 ? (
                    <div className="table-empty">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        Aún no tienes categorías con plan en este mes.
                    </div>
                ) : (
                    <table className="table-v">
                        <thead><tr><th>CATEGORÍA</th><th>LÍMITE</th><th>GASTADO</th><th>DIFERENCIA</th><th>USO</th></tr></thead>
                        <tbody>
                            {overview.rows.map((row, index) => {
                                const rowVariance = row.actual - row.budget;
                                return (
                                    <tr key={`${row.category}-${index}`}>
                                        <td style={{ fontWeight: 700 }}>{friendlyCategoryName(row.category)}</td>
                                        <td style={{ color: "var(--tx2)" }}>{currencyFormatter.format(row.budget)}</td>
                                        <td style={{ color: "var(--tx2)" }}>{currencyFormatter.format(row.actual)}</td>
                                        <td><span className={rowVariance <= 0 ? "pos" : "neg"} style={{ fontWeight: 700 }}>{rowVariance <= 0 ? "+" : "-"}{currencyFormatter.format(Math.abs(rowVariance))}</span></td>
                                        <td><span className={`ptag ${row.progress >= 100 ? "cr" : row.progress >= 70 ? "sg" : "if"}`}>{Math.round(row.progress)}%</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Period selector */}
            <div className="card fu in" style={{ transitionDelay: ".25s" }}>
                <div className="card-head"><div className="card-title">Cambiar periodo</div></div>
                <form style={{ display: "flex", gap: "10px", alignItems: "center" }} method="get">
                    <select className="filter-select" name="month" defaultValue={month} style={{ flex: 1, borderRadius: "var(--r3)" }}>
                        {monthOptions.map((option) => (
                            <option key={option} value={option}>{monthLabel(option)}</option>
                        ))}
                    </select>
                    <button type="submit" className="filter-btn">Aplicar</button>
                </form>
            </div>
        </div>
    );
}

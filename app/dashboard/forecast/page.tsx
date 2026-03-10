import Link from "next/link";
import { getForecastOverview } from "@/app/actions/forecast";
import { ForecastAssumptionsForm } from "@/components/forecast/ForecastAssumptionsForm";
import { ForecastChart } from "@/components/ui/ForecastChart";
import { ModuleHero } from "@/components/ui/ModuleHero";

interface ForecastPageProps {
    searchParams: Promise<{ month?: string; horizon?: string }>;
}

function getRecentMonths(count = 12) {
    const months: string[] = [];
    const current = new Date();
    for (let index = 0; index < count; index += 1) {
        const monthDate = new Date(current.getFullYear(), current.getMonth() - index, 1);
        const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        months.push(month);
    }
    return months;
}

function monthLabel(month: string) {
    const [year, monthValue] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
        new Date(year, monthValue - 1, 1)
    );
}

function formatAmount(value: number | null, currency: string) {
    if (value == null) return "No definido";
    return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value);
}

function formatPercent(value: number | null) {
    if (value == null) return "No definido";
    return `${value.toFixed(2)}%`;
}

function formatMonthCompact(month: string) {
    const [year, monthValue] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric" }).format(
        new Date(year, monthValue - 1, 1)
    );
}

function formatModelName(model: string) {
    const labels: Record<string, string> = {
        holt_winters: "Holt-Winters",
        arima: "ARIMA",
        sarima: "SARIMA",
        random_forest: "Random Forest",
        manual_assumptions: "Supuestos manuales",
        personal_average: "Promedio personal",
    };
    return labels[model] ?? model;
}

export default async function ForecastPage({ searchParams }: ForecastPageProps) {
    const resolvedSearchParams = await searchParams;
    const monthOptions = getRecentMonths(12);
    const month =
        resolvedSearchParams.month && /^\d{4}-\d{2}$/.test(resolvedSearchParams.month)
            ? resolvedSearchParams.month
            : monthOptions[0];
    const horizon =
        resolvedSearchParams.horizon && ["3", "6", "12"].includes(resolvedSearchParams.horizon)
            ? Number(resolvedSearchParams.horizon)
            : 6;

    const forecast = await getForecastOverview(month, horizon);
    const isPersonal = forecast.model.selected_model === "personal_average";
    const chartData = forecast.projections.map((projection) => ({
        month: projection.month,
        revenue: projection.revenue,
        opex: projection.opex,
        ebit: projection.ebit,
    }));

    return (
        <div className="min-h-screen">
            <ModuleHero
                eyebrow="FLUJO DIARIO · PRÓXIMO MES"
                title={isPersonal ? "Escenario del próximo ciclo" : "Escenario operativo del próximo ciclo"}
                description={isPersonal
                    ? "Fechas y movimientos reales para estimar cómo podría cerrar"
                    : "Historial y supuestos para estimar revenue, costos y EBIT"}
                actions={
                    <Link href="/dashboard/transactions/new" className="h-btn1 no-underline">Actualizar proyección</Link>
                }
                rightPanel={
                    <>
                        <div className="h-stat"><div className="h-stat-lbl">Modelo</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{formatModelName(forecast.model.selected_model)}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl">Horizonte</div><div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{forecast.horizon_months} meses</div></div>
                    </>
                }
            />

            {/* Stat Cards */}
            <div className="g4 fu in" style={{ transitionDelay: ".06s" }}>
                <div className="stat-card"><div className="stat-badge sb-ok">Seguimiento</div><div className="card-title" style={{ marginBottom: "6px" }}>{formatModelName(forecast.model.selected_model)}</div><div className="stat-desc">Modelo de proyección activo</div></div>
                <div className="stat-card"><div className="stat-badge sb-info">Informativo</div><div className="stat-n a">{forecast.horizon_months} meses</div><div className="stat-desc">Horizonte de proyección</div></div>
                <div className="stat-card"><div className="stat-badge sb-ng">Crítico</div><div className={`stat-n ${forecast.history.history_months_with_data >= 6 ? "" : "ng"}`}>{forecast.history.history_months_with_data} / {forecast.history.history_months_total}</div><div className="stat-desc">Historial útil acumulado</div></div>
                <div className="stat-card"><div className="stat-badge sb-ok">Seguimiento</div><div className="card-title" style={{ marginBottom: "6px" }}>{forecast.model.validation_mape_pct == null ? (isPersonal ? "Basado en promedios" : "No disponible") : `${forecast.model.validation_mape_pct.toFixed(2)}%`}</div><div className="stat-desc">Precisión del modelo actual</div></div>
            </div>

            {/* Chart */}
            <div className="card fu in" style={{ transitionDelay: ".1s" }}>
                <div className="card-head">
                    <div><div className="card-title">Tendencia proyectada</div><div className="card-sub">{isPersonal ? "Ingresos, gastos y flujo neto" : "Revenue, OPEX y EBIT"} para los próximos {forecast.horizon_months} meses</div></div>
                    <div className="card-action">Horizonte {forecast.horizon_months}m</div>
                </div>
                {forecast.projections.length === 0 ? (
                    <div style={{ height: "160px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--tx3)", fontSize: "13px", flexDirection: "column", gap: "8px" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        Sin datos históricos suficientes para proyectar.<br />
                        <Link href="/dashboard/transactions/new" style={{ color: "var(--acc)", fontWeight: 600, fontSize: "12px", textDecoration: "none" }}>Registra movimientos para activar la proyección →</Link>
                    </div>
                ) : (
                    <ForecastChart data={chartData} currency={forecast.currency} isPersonal={isPersonal} />
                )}
                <div style={{ display: "flex", gap: "16px", marginTop: "10px", paddingTop: "12px", borderTop: "1px solid var(--brd)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px" }}><span style={{ width: "10px", height: "3px", background: "var(--acc)", borderRadius: "99px", display: "inline-block" }}></span>{isPersonal ? "Flujo neto" : "EBIT"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px" }}><span style={{ width: "10px", height: "3px", background: "var(--ng)", borderRadius: "99px", display: "inline-block" }}></span>{isPersonal ? "Gastos" : "OPEX"}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11.5px" }}><span style={{ width: "10px", height: "3px", background: "var(--ok)", borderRadius: "99px", display: "inline-block" }}></span>{isPersonal ? "Ingresos" : "Revenue"}</div>
                </div>
            </div>

            {/* Projection table */}
            <div className="table-wrap fu in" style={{ transitionDelay: ".15s" }}>
                {forecast.projections.length === 0 ? (
                    <div className="table-empty">No hay datos suficientes para proyectar este periodo.</div>
                ) : (
                    <table className="table-v">
                        {isPersonal ? (
                            <>
                                <thead><tr><th>MES</th><th>INGRESOS</th><th>GASTOS</th><th>FLUJO NETO</th><th>TASA AHORRO</th></tr></thead>
                                <tbody>
                                    {forecast.projections.map((projection) => (
                                        <tr key={projection.month}>
                                            <td style={{ fontWeight: 700 }}>{formatMonthCompact(projection.month)}</td>
                                            <td className="pos">{formatAmount(projection.revenue, forecast.currency)}</td>
                                            <td className="neg">{formatAmount(projection.opex, forecast.currency)}</td>
                                            <td><span className={projection.ebit >= 0 ? "pos" : "neg"} style={{ fontWeight: 700 }}>{formatAmount(projection.ebit, forecast.currency)}</span></td>
                                            <td>{projection.operating_margin_pct.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        ) : (
                            <>
                                <thead><tr><th>MES</th><th>REVENUE</th><th>COGS</th><th>OPEX</th><th>EBIT</th><th>MARGEN</th></tr></thead>
                                <tbody>
                                    {forecast.projections.map((projection) => (
                                        <tr key={projection.month}>
                                            <td style={{ fontWeight: 700 }}>{formatMonthCompact(projection.month)}</td>
                                            <td>{formatAmount(projection.revenue, forecast.currency)}</td>
                                            <td>{formatAmount(projection.cogs, forecast.currency)}</td>
                                            <td>{formatAmount(projection.opex, forecast.currency)}</td>
                                            <td><span className={projection.ebit >= 0 ? "pos" : "neg"} style={{ fontWeight: 700 }}>{formatAmount(projection.ebit, forecast.currency)}</span></td>
                                            <td>{projection.operating_margin_pct.toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}
                    </table>
                )}
            </div>

            {/* Assumptions form (business) */}
            {!isPersonal && (
                <div className="card fu in" style={{ transitionDelay: ".2s" }}>
                    <div className="card-head"><div><div className="card-title">Editar supuestos</div><div className="card-sub">Mantén auditables los cambios de hipótesis por periodo</div></div></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                        <div className="dist-item"><div className="dist-lbl">Revenue Growth</div><div className="dist-val">{formatPercent(forecast.revenue_growth_rate)}</div></div>
                        <div className="dist-item"><div className="dist-lbl">COGS %</div><div className="dist-val">{formatPercent(forecast.cogs_percent)}</div></div>
                        <div className="dist-item"><div className="dist-lbl">Fixed OPEX</div><div className="dist-val">{formatAmount(forecast.fixed_opex, forecast.currency)}</div></div>
                        <div className="dist-item"><div className="dist-lbl">Variable OPEX %</div><div className="dist-val">{formatPercent(forecast.variable_opex_percent)}</div></div>
                    </div>
                    <ForecastAssumptionsForm
                        month={month}
                        initialValues={{
                            revenue_growth_rate: forecast.revenue_growth_rate,
                            revenue_amount: forecast.revenue_amount,
                            cogs_percent: forecast.cogs_percent,
                            fixed_opex: forecast.fixed_opex,
                            variable_opex_percent: forecast.variable_opex_percent,
                            one_off_amount: forecast.one_off_amount,
                            note: forecast.note,
                        }}
                    />
                </div>
            )}

            {/* Period + Horizon selector */}
            <div className="card fu in" style={{ transitionDelay: ".25s" }}>
                <div className="card-head"><div className="card-title">Ajustar parámetros</div></div>
                <form style={{ display: "flex", gap: "10px", alignItems: "center" }} method="get">
                    <select className="filter-select" name="horizon" defaultValue={String(horizon)} style={{ borderRadius: "var(--r3)" }}>
                        <option value="3">3 meses</option>
                        <option value="6">6 meses</option>
                        <option value="12">12 meses</option>
                    </select>
                    <select className="filter-select" name="month" defaultValue={month} style={{ flex: 1, borderRadius: "var(--r3)" }}>
                        {monthOptions.map((option) => (
                            <option key={option} value={option}>{monthLabel(option)}</option>
                        ))}
                    </select>
                    <button type="submit" className="filter-btn">Actualizar proyección</button>
                </form>
            </div>
        </div>
    );
}

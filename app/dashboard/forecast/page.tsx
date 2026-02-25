import { getForecastOverview } from "@/app/actions/forecast";
import { ForecastAssumptionsForm } from "@/components/forecast/ForecastAssumptionsForm";

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
        manual_assumptions: "Manual por supuestos",
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
    const horizon = resolvedSearchParams.horizon && ["3", "6", "12"].includes(resolvedSearchParams.horizon)
        ? Number(resolvedSearchParams.horizon)
        : 6;

    const forecast = await getForecastOverview(month, horizon);
    const isPersonal = forecast.model.selected_model === "personal_average";

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                            {isPersonal ? "Tu Futuro Financiero" : "Forecast"}
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">
                            {isPersonal ? "Proyección de Cashflow" : "Supuestos financieros"}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-500">
                            {isPersonal
                                ? "Basado en tu historial de ingresos y gastos, así se ve tu futuro financiero si mantienes los mismos hábitos."
                                : "Define crecimiento, estructura de costos y partidas no recurrentes para proyectar resultados operativos del siguiente cierre."}
                        </p>
                    </div>
                    <form method="get" className="flex items-center gap-2">
                        <select className="input-field w-36 text-sm" name="horizon" defaultValue={String(horizon)}>
                            <option value="3">3 meses</option>
                            <option value="6">6 meses</option>
                            <option value="12">12 meses</option>
                        </select>
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

            {/* ── KPI Cards ── */}
            {isPersonal ? (
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <article className="rounded-2xl border border-[#bedfd8] bg-[#edf9f6] p-4 shadow-card">
                        <p className="text-sm text-[#117068]">Ingreso promedio mensual</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.drivers.fixed_opex > 0 ? (forecast.projections[0]?.revenue ?? 0) : 0, forecast.currency)}</p>
                    </article>
                    <article className="rounded-2xl border border-[#f4d5bf] bg-[#fff4eb] p-4 shadow-card">
                        <p className="text-sm text-[#a3462a]">Gasto promedio mensual</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.drivers.fixed_opex, forecast.currency)}</p>
                    </article>
                    <article className={`rounded-2xl border p-4 shadow-card ${(forecast.projections[0]?.ebit ?? 0) >= 0 ? "border-[#bedfd8] bg-[#edf9f6]" : "border-[#f4d5bf] bg-[#fff4eb]"}`}>
                        <p className={`text-sm ${(forecast.projections[0]?.ebit ?? 0) >= 0 ? "text-[#117068]" : "text-[#a3462a]"}`}>Flujo neto mensual</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.projections[0]?.ebit ?? 0, forecast.currency)}</p>
                    </article>
                </section>
            ) : (
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                        <p className="text-sm text-surface-500">Revenue Amount</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.revenue_amount, forecast.currency)}</p>
                    </article>
                    <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                        <p className="text-sm text-surface-500">Revenue Growth</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatPercent(forecast.revenue_growth_rate)}</p>
                    </article>
                    <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                        <p className="text-sm text-surface-500">COGS %</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatPercent(forecast.cogs_percent)}</p>
                    </article>
                    <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                        <p className="text-sm text-surface-500">Fixed OPEX</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.fixed_opex, forecast.currency)}</p>
                    </article>
                    <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                        <p className="text-sm text-surface-500">Variable OPEX %</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatPercent(forecast.variable_opex_percent)}</p>
                    </article>
                    <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                        <p className="text-sm text-surface-500">One-off Items</p>
                        <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.one_off_amount, forecast.currency)}</p>
                    </article>
                </section>
            )}

            {/* ── Model Info ── */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Modelo utilizado</p>
                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">{formatModelName(forecast.model.selected_model)}</p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">{isPersonal ? "Precisión" : "MAPE validación"}</p>
                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                        {forecast.model.validation_mape_pct == null
                            ? (isPersonal ? "Basado en promedios" : "No disponible")
                            : `${forecast.model.validation_mape_pct.toFixed(2)}%`}
                    </p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Historial analizado</p>
                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                        {forecast.history.history_months_with_data} / {forecast.history.history_months_total} meses
                    </p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Horizonte de proyección</p>
                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">{forecast.horizon_months} meses</p>
                </article>
            </section>

            {/* ── Analysis Details ── */}
            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">
                    {isPersonal ? "Análisis de tus finanzas" : "Lógica aplicada al pronóstico"}
                </h3>
                <p className="mt-1 text-sm text-surface-500">{forecast.model.reason}</p>

                {!isPersonal && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                            <p className="text-xs uppercase tracking-wider text-surface-500">COGS aplicado</p>
                            <p className="mt-1 text-base font-semibold text-[#10283b]">{forecast.drivers.cogs_percent.toFixed(2)}%</p>
                        </div>
                        <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                            <p className="text-xs uppercase tracking-wider text-surface-500">Fixed OPEX</p>
                            <p className="mt-1 text-base font-semibold text-[#10283b]">{formatAmount(forecast.drivers.fixed_opex, forecast.currency)}</p>
                        </div>
                        <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                            <p className="text-xs uppercase tracking-wider text-surface-500">Variable OPEX</p>
                            <p className="mt-1 text-base font-semibold text-[#10283b]">{forecast.drivers.variable_opex_percent.toFixed(2)}%</p>
                        </div>
                        <div className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                            <p className="text-xs uppercase tracking-wider text-surface-500">One-off inicial</p>
                            <p className="mt-1 text-base font-semibold text-[#10283b]">{formatAmount(forecast.drivers.one_off_amount, forecast.currency)}</p>
                        </div>
                    </div>
                )}

                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-surface-600">
                    {forecast.items_used.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </section>

            {/* ── Projection Table ── */}
            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Proyección mensual</h3>
                <p className="mt-1 text-sm text-surface-500">
                    {isPersonal
                        ? "Proyección de ingresos, gastos y flujo neto para los próximos meses."
                        : "Resultado proyectado para Revenue, COGS, OPEX, EBIT y margen operativo."}
                </p>

                {forecast.projections.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 px-4 py-4 text-sm text-surface-500">
                        {isPersonal
                            ? "Registra al menos 2 meses de transacciones para generar tu proyección."
                            : "No hay suficiente información histórica para generar una proyección."}
                    </div>
                ) : isPersonal ? (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-surface-200">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead className="bg-surface-50 text-left text-surface-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Mes</th>
                                    <th className="px-4 py-3 font-semibold">Ingresos</th>
                                    <th className="px-4 py-3 font-semibold">Gastos</th>
                                    <th className="px-4 py-3 font-semibold">Flujo Neto</th>
                                    <th className="px-4 py-3 font-semibold">Tasa de Ahorro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200 bg-white">
                                {forecast.projections.map((projection) => (
                                    <tr key={projection.month}>
                                        <td className="px-4 py-3 font-medium text-[#10283b]">{formatMonthCompact(projection.month)}</td>
                                        <td className="px-4 py-3 text-positive-600">{formatAmount(projection.revenue, forecast.currency)}</td>
                                        <td className="px-4 py-3 text-negative-600">{formatAmount(projection.opex, forecast.currency)}</td>
                                        <td className={`px-4 py-3 font-semibold ${projection.ebit >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                            {formatAmount(projection.ebit, forecast.currency)}
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${projection.operating_margin_pct >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                            {projection.operating_margin_pct.toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-surface-200">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-surface-50 text-left text-surface-500">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Mes</th>
                                    <th className="px-4 py-3 font-semibold">Revenue</th>
                                    <th className="px-4 py-3 font-semibold">COGS</th>
                                    <th className="px-4 py-3 font-semibold">OPEX</th>
                                    <th className="px-4 py-3 font-semibold">EBIT</th>
                                    <th className="px-4 py-3 font-semibold">Operating Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-200 bg-white">
                                {forecast.projections.map((projection) => (
                                    <tr key={projection.month}>
                                        <td className="px-4 py-3 font-medium text-[#10283b]">{formatMonthCompact(projection.month)}</td>
                                        <td className="px-4 py-3">{formatAmount(projection.revenue, forecast.currency)}</td>
                                        <td className="px-4 py-3">{formatAmount(projection.cogs, forecast.currency)}</td>
                                        <td className="px-4 py-3">{formatAmount(projection.opex, forecast.currency)}</td>
                                        <td className={`px-4 py-3 font-semibold ${projection.ebit >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                            {formatAmount(projection.ebit, forecast.currency)}
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${projection.operating_margin_pct >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                            {projection.operating_margin_pct.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ── Assumptions Form (Business only) ── */}
            {!isPersonal && (
                <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Editar supuestos del periodo</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Información auditable para explicar cambios en margen operativo y proyecciones.
                    </p>
                    <div className="mt-4">
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
                </section>
            )}

            {/* ── Personal Tips ── */}
            {isPersonal && forecast.projections.length > 0 && (
                <section className="rounded-3xl border border-[#b8d8f0] bg-[#edf6fd] p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#0d4c7a]">Recomendaciones</h3>
                    <ul className="mt-3 space-y-2 text-sm text-surface-600">
                        {(forecast.projections[0]?.ebit ?? 0) > 0 ? (
                            <>
                                <li>Tu flujo neto es positivo. Estás ahorrando mensualmente.</li>
                                <li>Considera asignar una parte a tus metas de ahorro desde <a href="/dashboard/transactions/new" className="text-[#0d4c7a] underline">Registrar movimiento</a>.</li>
                                {(forecast.projections[0]?.operating_margin_pct ?? 0) >= 20 && (
                                    <li>Tu tasa de ahorro es de {forecast.projections[0]?.operating_margin_pct.toFixed(1)}% y se encuentra en un nivel saludable.</li>
                                )}
                            </>
                        ) : (
                            <>
                                <li>Tu flujo neto es negativo. Estás gastando más de lo que ingresas.</li>
                                <li>Revisa tu <a href="/dashboard/budget" className="text-[#0d4c7a] underline">presupuesto</a> para identificar categorías donde puedes recortar.</li>
                            </>
                        )}
                    </ul>
                </section>
            )}
        </div>
    );
}

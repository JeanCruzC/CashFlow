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
        <div className="space-y-7 animate-fade-in">
            <ModuleHero
                eyebrow="Flujo diario · Proximo mes"
                title={isPersonal ? "Escenario del proximo ciclo" : "Escenario operativo del proximo ciclo"}
                description={
                    isPersonal
                        ? "Usamos fechas y movimientos reales para estimar como podria cerrar el siguiente mes."
                        : "Usamos historial y supuestos para estimar revenue, costos, margen y EBIT del siguiente ciclo."
                }
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Parametros
                        </p>
                        <form method="get" className="mt-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <select className="input-field w-full text-sm" name="horizon" defaultValue={String(horizon)}>
                                    <option value="3">3 meses</option>
                                    <option value="6">6 meses</option>
                                    <option value="12">12 meses</option>
                                </select>
                                <select className="input-field w-full text-sm" name="month" defaultValue={month}>
                                    {monthOptions.map((option) => (
                                        <option key={option} value={option}>
                                            {monthLabel(option)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="btn-secondary w-full text-sm">
                                Actualizar proyeccion
                            </button>
                        </form>

                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">Modelo</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {formatModelName(forecast.model.selected_model)}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Horizonte</span>
                                <span className="font-semibold text-[#0f2233]">{forecast.horizon_months} meses</span>
                            </div>
                        </div>
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Modelo</p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2233]">
                        {formatModelName(forecast.model.selected_model)}
                    </p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Horizonte</p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2233]">{forecast.horizon_months} meses</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Historial útil</p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2233]">
                        {forecast.history.history_months_with_data} / {forecast.history.history_months_total} meses
                    </p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                        {isPersonal ? "Precisión" : "MAPE validación"}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#0f2233]">
                        {forecast.model.validation_mape_pct == null
                            ? isPersonal
                                ? "Basado en promedios"
                                : "No disponible"
                            : `${forecast.model.validation_mape_pct.toFixed(2)}%`}
                    </p>
                </article>
            </section>

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-[#10283b]">Tendencia proyectada</h3>
                        <p className="text-sm text-surface-500">
                            {isPersonal ? "Ingresos, gastos y flujo neto" : "Revenue, OPEX y EBIT"} para los próximos{" "}
                            {forecast.horizon_months} meses.
                        </p>
                    </div>
                    <span className="rounded-full border border-[#d9e2f0] bg-[#f5f9ff] px-3 py-1 text-xs font-semibold text-[#0f2233]">
                        Horizonte {forecast.horizon_months}m
                    </span>
                </div>
                <ForecastChart
                    data={chartData}
                    currency={forecast.currency}
                    isPersonal={isPersonal}
                />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#10283b]">Lógica aplicada</h3>
                    <p className="mt-1 text-sm text-surface-600">{forecast.model.reason}</p>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-surface-600">
                        {forecast.items_used.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>

                    {!isPersonal && (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-sm">
                                <p className="text-surface-500">Revenue Growth</p>
                                <p className="mt-1 font-semibold text-[#0f2233]">
                                    {formatPercent(forecast.revenue_growth_rate)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-sm">
                                <p className="text-surface-500">COGS %</p>
                                <p className="mt-1 font-semibold text-[#0f2233]">
                                    {formatPercent(forecast.cogs_percent)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-sm">
                                <p className="text-surface-500">Fixed OPEX</p>
                                <p className="mt-1 font-semibold text-[#0f2233]">
                                    {formatAmount(forecast.fixed_opex, forecast.currency)}
                                </p>
                            </div>
                            <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-sm">
                                <p className="text-surface-500">Variable OPEX %</p>
                                <p className="mt-1 font-semibold text-[#0f2233]">
                                    {formatPercent(forecast.variable_opex_percent)}
                                </p>
                            </div>
                        </div>
                    )}
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-[#f5f9ff] p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#10283b]">Lectura rápida del periodo</h3>
                    <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3">
                            <p className="text-xs text-surface-500">
                                {isPersonal ? "Ingreso promedio mensual" : "Revenue base"}
                            </p>
                            <p className="mt-1 text-xl font-semibold text-[#0f2233]">
                                {formatAmount(forecast.projections[0]?.revenue ?? 0, forecast.currency)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3">
                            <p className="text-xs text-surface-500">
                                {isPersonal ? "Gasto promedio mensual" : "OPEX base"}
                            </p>
                            <p className="mt-1 text-xl font-semibold text-[#0f2233]">
                                {formatAmount(forecast.projections[0]?.opex ?? 0, forecast.currency)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3">
                            <p className="text-xs text-surface-500">
                                {isPersonal ? "Flujo neto mensual" : "EBIT base"}
                            </p>
                            <p
                                className={`mt-1 text-xl font-semibold ${
                                    (forecast.projections[0]?.ebit ?? 0) >= 0
                                        ? "text-positive-600"
                                        : "text-negative-600"
                                }`}
                            >
                                {formatAmount(forecast.projections[0]?.ebit ?? 0, forecast.currency)}
                            </p>
                        </div>
                    </div>

                    {isPersonal && (
                        <div className="mt-5 rounded-xl border border-[#d9e2f0] bg-white p-4">
                            <p className="text-sm font-semibold text-[#0f2233]">Siguiente acción recomendada</p>
                            <p className="mt-1 text-sm text-surface-600">
                                Registra más movimientos reales para que la proyección deje de depender de promedios simples.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                                    Registrar movimiento
                                </Link>
                                <Link href="/dashboard/budget" className="btn-secondary text-sm no-underline">
                                    Ajustar presupuesto
                                </Link>
                            </div>
                        </div>
                    )}
                </article>
            </section>

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Proyección mensual</h3>
                {forecast.projections.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                        No hay datos suficientes para proyectar este periodo.
                    </div>
                ) : (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-[#d9e2f0]">
                        {isPersonal ? (
                            <table className="w-full min-w-[700px] text-sm">
                                <thead className="bg-[#f5f9ff]">
                                    <tr className="text-left text-surface-500">
                                        <th className="px-4 py-3 font-semibold">Mes</th>
                                        <th className="px-4 py-3 font-semibold">Ingresos</th>
                                        <th className="px-4 py-3 font-semibold">Gastos</th>
                                        <th className="px-4 py-3 font-semibold">Flujo neto</th>
                                        <th className="px-4 py-3 font-semibold">Tasa ahorro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-200 bg-white">
                                    {forecast.projections.map((projection) => (
                                        <tr key={projection.month}>
                                            <td className="px-4 py-3 font-medium text-[#0f2233]">
                                                {formatMonthCompact(projection.month)}
                                            </td>
                                            <td className="px-4 py-3 text-positive-600">
                                                {formatAmount(projection.revenue, forecast.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-negative-600">
                                                {formatAmount(projection.opex, forecast.currency)}
                                            </td>
                                            <td
                                                className={`px-4 py-3 font-semibold ${
                                                    projection.ebit >= 0
                                                        ? "text-positive-600"
                                                        : "text-negative-600"
                                                }`}
                                            >
                                                {formatAmount(projection.ebit, forecast.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-[#0f2233]">
                                                {projection.operating_margin_pct.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full min-w-[860px] text-sm">
                                <thead className="bg-[#f5f9ff]">
                                    <tr className="text-left text-surface-500">
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
                                            <td className="px-4 py-3 font-medium text-[#0f2233]">
                                                {formatMonthCompact(projection.month)}
                                            </td>
                                            <td className="px-4 py-3">{formatAmount(projection.revenue, forecast.currency)}</td>
                                            <td className="px-4 py-3">{formatAmount(projection.cogs, forecast.currency)}</td>
                                            <td className="px-4 py-3">{formatAmount(projection.opex, forecast.currency)}</td>
                                            <td
                                                className={`px-4 py-3 font-semibold ${
                                                    projection.ebit >= 0
                                                        ? "text-positive-600"
                                                        : "text-negative-600"
                                                }`}
                                            >
                                                {formatAmount(projection.ebit, forecast.currency)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {projection.operating_margin_pct.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </section>

            {!isPersonal && (
                <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-base font-semibold text-[#10283b]">Editar supuestos</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Mantén auditables los cambios de hipótesis por periodo.
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
        </div>
    );
}

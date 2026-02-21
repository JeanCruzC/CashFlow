import { getForecastOverview } from "@/app/actions/forecast";
import { ForecastAssumptionsForm } from "@/components/forecast/ForecastAssumptionsForm";

interface ForecastPageProps {
    searchParams: { month?: string };
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

function formatAmount(value: number | null) {
    if (value == null) return "No definido";
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" }).format(value);
}

function formatPercent(value: number | null) {
    if (value == null) return "No definido";
    return `${value.toFixed(2)}%`;
}

export default async function ForecastPage({ searchParams }: ForecastPageProps) {
    const monthOptions = getRecentMonths(12);
    const month =
        searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
            ? searchParams.month
            : monthOptions[0];

    const forecast = await getForecastOverview(month);

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">Forecast</p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Supuestos financieros</h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-500">
                            Define crecimiento, estructura de costos y partidas no recurrentes para proyectar
                            resultados operativos del siguiente cierre.
                        </p>
                    </div>
                    <form method="get" className="flex items-center gap-2">
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

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Revenue Amount</p>
                    <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.revenue_amount)}</p>
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
                    <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.fixed_opex)}</p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Variable OPEX %</p>
                    <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatPercent(forecast.variable_opex_percent)}</p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">One-off Items</p>
                    <p className="mt-1 text-xl font-semibold text-[#0f2233]">{formatAmount(forecast.one_off_amount)}</p>
                </article>
            </section>

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
        </div>
    );
}

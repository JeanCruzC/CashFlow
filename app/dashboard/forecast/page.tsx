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
    const requestedMonth = searchParams.month;
    const month =
        requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth)
            ? requestedMonth
            : monthOptions[0];

    const forecast = await getForecastOverview(month);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Pronóstico</h1>
                    <p className="text-muted mt-1">
                        Registra supuestos financieros para proyectar el siguiente cierre.
                    </p>
                </div>
                <form method="get" className="flex items-center gap-2">
                    <select className="input-field text-sm w-52" name="month" defaultValue={month}>
                        {monthOptions.map((option) => (
                            <option key={option} value={option}>
                                {monthLabel(option)}
                            </option>
                        ))}
                    </select>
                    <button type="submit" className="btn-secondary text-sm">
                        Ver
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <article className="card p-4">
                    <p className="text-sm text-muted">Meta de ingresos</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(forecast.revenue_amount)}</p>
                </article>
                <article className="card p-4">
                    <p className="text-sm text-muted">Crecimiento esperado</p>
                    <p className="text-xl font-semibold mt-1">{formatPercent(forecast.revenue_growth_rate)}</p>
                </article>
                <article className="card p-4">
                    <p className="text-sm text-muted">COGS proyectado</p>
                    <p className="text-xl font-semibold mt-1">{formatPercent(forecast.cogs_percent)}</p>
                </article>
                <article className="card p-4">
                    <p className="text-sm text-muted">Gasto fijo</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(forecast.fixed_opex)}</p>
                </article>
                <article className="card p-4">
                    <p className="text-sm text-muted">Gasto variable</p>
                    <p className="text-xl font-semibold mt-1">{formatPercent(forecast.variable_opex_percent)}</p>
                </article>
                <article className="card p-4">
                    <p className="text-sm text-muted">Partida extraordinaria</p>
                    <p className="text-xl font-semibold mt-1">{formatAmount(forecast.one_off_amount)}</p>
                </article>
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
    );
}

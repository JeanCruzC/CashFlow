"use client";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

interface ProjectionPoint {
    month: string;
    revenue: number | null;
    opex: number | null;
    ebit: number | null;
}

function formatCompactMonth(month: string) {
    const [year, m] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("es", { month: "short", year: "2-digit" }).format(
        new Date(year, m - 1, 1)
    );
}

function formatCurrency(value: number, currency: string) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

function CustomTooltip({
    active,
    payload,
    label,
    currency,
    isPersonal,
}: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
    currency: string;
    isPersonal: boolean;
}) {
    if (!active || !payload) return null;

    const labelMap: Record<string, string> = isPersonal
        ? { revenue: "Ingresos", opex: "Gastos", ebit: "Flujo neto" }
        : { revenue: "Revenue", opex: "OPEX", ebit: "EBIT" };

    return (
        <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3 shadow-lg">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2">
                {label}
            </p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                    <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-surface-600">
                        {labelMap[entry.dataKey] ?? entry.dataKey}
                    </span>
                    <span className="ml-auto font-semibold text-[#0f2233]">
                        {formatCurrency(entry.value, currency)}
                    </span>
                </div>
            ))}
        </div>
    );
}

export function ForecastChart({
    data,
    currency = "USD",
    isPersonal = false,
}: {
    data: ProjectionPoint[];
    currency?: string;
    isPersonal?: boolean;
}) {
    if (data.length === 0) {
        return (
            <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] text-sm text-surface-400">
                No hay datos suficientes para proyectar
            </div>
        );
    }

    const formatted = data.map((d) => ({
        ...d,
        label: formatCompactMonth(d.month),
        revenue: d.revenue ?? 0,
        opex: d.opex ?? 0,
        ebit: d.ebit ?? 0,
    }));

    const legendMap: Record<string, string> = isPersonal
        ? { revenue: "Ingresos", opex: "Gastos", ebit: "Flujo neto" }
        : { revenue: "Revenue", opex: "OPEX", ebit: "EBIT" };

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={formatted}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                    <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#117068" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#117068" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="opexGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#e05252" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#e05252" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ebitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d4c7a" stopOpacity={0.12} />
                            <stop offset="95%" stopColor="#0d4c7a" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="4 4"
                        stroke="#e8ecf4"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: "#6B7394", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: "#6B7394", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                        width={48}
                    />
                    <Tooltip
                        content={<CustomTooltip currency={currency} isPersonal={isPersonal} />}
                        cursor={{ stroke: "#d9e2f0" }}
                    />
                    <Legend
                        formatter={(value: string) => legendMap[value] ?? value}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#117068"
                        strokeWidth={2}
                        fill="url(#revenueGrad)"
                        dot={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="opex"
                        stroke="#e05252"
                        strokeWidth={2}
                        fill="url(#opexGrad)"
                        dot={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="ebit"
                        stroke="#0d4c7a"
                        strokeWidth={2}
                        fill="url(#ebitGrad)"
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

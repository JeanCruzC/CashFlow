"use client";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
} from "recharts";

interface BudgetRow {
    category: string;
    budget: number;
    actual: number;
    progress: number;
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
    currency,
}: {
    active?: boolean;
    payload?: Array<{
        value: number;
        dataKey: string;
        payload: BudgetRow;
    }>;
    currency: string;
}) {
    if (!active || !payload?.[0]) return null;
    const row = payload[0].payload;
    const variance = row.actual - row.budget;
    return (
        <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3 shadow-lg text-sm">
            <p className="font-semibold text-[#0f2233] mb-1">{row.category}</p>
            <div className="space-y-0.5 text-surface-600">
                <p>Tope: {formatCurrency(row.budget, currency)}</p>
                <p>Ejecutado: {formatCurrency(row.actual, currency)}</p>
                <p className={variance > 0 ? "text-negative-600 font-semibold" : "text-positive-600 font-semibold"}>
                    {variance > 0 ? "Exceso" : "Margen"}: {formatCurrency(Math.abs(variance), currency)}
                </p>
            </div>
        </div>
    );
}

export function BudgetBars({
    rows,
    currency = "USD",
}: {
    rows: BudgetRow[];
    currency?: string;
}) {
    if (rows.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] text-sm text-surface-400">
                No tienes topes configurados para este mes.
            </div>
        );
    }

    const chartHeight = Math.max(rows.length * 48, 200);

    return (
        <div style={{ height: chartHeight }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={rows}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                    barGap={4}
                >
                    <XAxis
                        type="number"
                        tick={{ fill: "#6B7394", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                    />
                    <YAxis
                        type="category"
                        dataKey="category"
                        tick={{ fill: "#0f2233", fontSize: 12, fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                        width={140}
                    />
                    <Tooltip
                        content={<CustomTooltip currency={currency} />}
                        cursor={{ fill: "rgba(0,0,0,0.03)" }}
                    />
                    <Bar
                        dataKey="budget"
                        fill="#d9e2f0"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                        name="Tope"
                    />
                    <Bar
                        dataKey="actual"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                        name="Ejecutado"
                    >
                        {rows.map((row, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={row.actual > row.budget ? "#e05252" : "#117068"}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

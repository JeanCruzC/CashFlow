"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function BudgetRing({
    used,
    total,
    currency = "USD",
}: {
    used: number;
    total: number;
    currency?: string;
}) {
    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    const remaining = Math.max(total - used, 0);
    const isOver = used > total;

    const data = [
        { name: "used", value: Math.min(used, total) },
        { name: "free", value: remaining },
    ];

    const usedColor = isOver ? "#e05252" : "#117068";
    const freeColor = "#e8ecf4";

    const formatted = new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(used);

    return (
        <div className="flex items-center gap-5">
            <div className="relative h-32 w-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius="70%"
                            outerRadius="100%"
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                        >
                            <Cell fill={usedColor} />
                            <Cell fill={freeColor} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[#0f2233]">
                        {Math.round(pct)}%
                    </span>
                    <span className="text-[10px] text-surface-500">usado</span>
                </div>
            </div>
            <div className="space-y-1.5 text-sm">
                <p className="text-surface-500">Ejecutado</p>
                <p className={`text-xl font-semibold ${isOver ? "text-negative-600" : "text-[#0f2233]"}`}>
                    {formatted}
                </p>
                <p className="text-xs text-surface-400">
                    de {new Intl.NumberFormat("es-PE", {
                        style: "currency",
                        currency,
                        maximumFractionDigits: 0,
                    }).format(total)} presupuestado
                </p>
                {isOver && (
                    <p className="text-xs font-semibold text-negative-600">
                        ⚠ Excedido por{" "}
                        {new Intl.NumberFormat("es-PE", {
                            style: "currency",
                            currency,
                            maximumFractionDigits: 0,
                        }).format(used - total)}
                    </p>
                )}
            </div>
        </div>
    );
}

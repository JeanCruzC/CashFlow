"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface MixSlice {
    label: string;
    value: number;
    color: string;
}

function formatCurrency(value: number, currency: string, locale: "es" | "en") {
    const language = locale === "en" ? "en-US" : "es-PE";
    return new Intl.NumberFormat(language, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

function MixTooltip({
    active,
    payload,
    currency,
    locale,
}: {
    active?: boolean;
    payload?: Array<{
        value: number;
        payload: MixSlice;
    }>;
    currency: string;
    locale: "es" | "en";
}) {
    if (!active || !payload?.[0]) return null;

    const row = payload[0].payload;
    return (
        <div className="rounded-xl border border-[#d9e2f0] bg-white px-3 py-2 shadow-lg">
            <p className="text-xs font-semibold text-[#0f2233]">{row.label}</p>
            <p className="mt-1 text-sm text-surface-600">{formatCurrency(row.value, currency, locale)}</p>
        </div>
    );
}

export function SpendingMixChart({
    data,
    total,
    currency = "USD",
    locale = "es",
}: {
    data: MixSlice[];
    total: number;
    currency?: string;
    locale?: "es" | "en";
}) {
    const slices = data.filter((slice) => slice.value > 0);

    if (slices.length === 0 || total <= 0) {
        return (
            <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] text-sm text-surface-400">
                Agrega presupuesto y deudas para ver la distribucion.
            </div>
        );
    }

    return (
        <div className="relative h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={slices}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="62%"
                        outerRadius="92%"
                        paddingAngle={2}
                        stroke="none"
                    >
                        {slices.map((slice) => (
                            <Cell key={slice.label} fill={slice.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<MixTooltip currency={currency} locale={locale} />} />
                </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-surface-500">
                    Total ciclo
                </p>
                <p className="mt-1 text-xl font-semibold text-[#0f2233]">
                    {formatCurrency(total, currency, locale)}
                </p>
            </div>
        </div>
    );
}

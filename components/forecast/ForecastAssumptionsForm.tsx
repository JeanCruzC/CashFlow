"use client";

import { useState, useTransition } from "react";
import { upsertForecastAssumption } from "@/app/actions/forecast";
import { useRouter } from "next/navigation";

interface ForecastAssumptionsFormProps {
    month: string;
    initialValues: {
        revenue_growth_rate: number | null;
        revenue_amount: number | null;
        cogs_percent: number | null;
        fixed_opex: number | null;
        variable_opex_percent: number | null;
        one_off_amount: number | null;
        note: string | null;
    };
}

function toStringOrEmpty(value: number | null) {
    return value == null ? "" : String(value);
}

function parseOptionalNumber(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isFinite(value) ? value : NaN;
}

export function ForecastAssumptionsForm({ month, initialValues }: ForecastAssumptionsFormProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [revenueGrowthRate, setRevenueGrowthRate] = useState(
        toStringOrEmpty(initialValues.revenue_growth_rate)
    );
    const [revenueAmount, setRevenueAmount] = useState(
        toStringOrEmpty(initialValues.revenue_amount)
    );
    const [cogsPercent, setCogsPercent] = useState(toStringOrEmpty(initialValues.cogs_percent));
    const [fixedOpex, setFixedOpex] = useState(toStringOrEmpty(initialValues.fixed_opex));
    const [variableOpexPercent, setVariableOpexPercent] = useState(
        toStringOrEmpty(initialValues.variable_opex_percent)
    );
    const [oneOffAmount, setOneOffAmount] = useState(
        toStringOrEmpty(initialValues.one_off_amount)
    );
    const [note, setNote] = useState(initialValues.note ?? "");

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const payload = {
                month,
                revenue_growth_rate: parseOptionalNumber(revenueGrowthRate),
                revenue_amount: parseOptionalNumber(revenueAmount),
                cogs_percent: parseOptionalNumber(cogsPercent),
                fixed_opex: parseOptionalNumber(fixedOpex),
                variable_opex_percent: parseOptionalNumber(variableOpexPercent),
                one_off_amount: parseOptionalNumber(oneOffAmount),
                note: note.trim() || undefined,
            };

            if (Object.values(payload).some((value) => typeof value === "number" && Number.isNaN(value))) {
                setError("Revisa los valores numéricos ingresados.");
                return;
            }

            const result = await upsertForecastAssumption(payload);
            if (result.error) {
                setError(result.error);
                return;
            }

            setSuccess("Pronóstico guardado correctamente.");
            router.refresh();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-200 bg-surface-50/60 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="label">Crecimiento de ingresos (%)</label>
                    <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={revenueGrowthRate}
                        onChange={(event) => setRevenueGrowthRate(event.target.value)}
                        placeholder="Opcional"
                    />
                </div>
                <div>
                    <label className="label">Meta de ingresos</label>
                    <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={revenueAmount}
                        onChange={(event) => setRevenueAmount(event.target.value)}
                        placeholder="Opcional"
                    />
                </div>
                <div>
                    <label className="label">COGS (%)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input-field"
                        value={cogsPercent}
                        onChange={(event) => setCogsPercent(event.target.value)}
                        placeholder="Opcional"
                    />
                </div>
                <div>
                    <label className="label">Gasto fijo operativo</label>
                    <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={fixedOpex}
                        onChange={(event) => setFixedOpex(event.target.value)}
                        placeholder="Opcional"
                    />
                </div>
                <div>
                    <label className="label">Gasto variable (%)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="input-field"
                        value={variableOpexPercent}
                        onChange={(event) => setVariableOpexPercent(event.target.value)}
                        placeholder="Opcional"
                    />
                </div>
                <div>
                    <label className="label">Partida extraordinaria</label>
                    <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={oneOffAmount}
                        onChange={(event) => setOneOffAmount(event.target.value)}
                        placeholder="Opcional"
                    />
                </div>
            </div>

            <div>
                <label className="label">Notas</label>
                <textarea
                    className="input-field min-h-[96px]"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Supuestos, riesgos y comentarios del mes"
                />
            </div>

            {error && <p className="text-sm text-negative-600 bg-negative-50 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-positive-700 bg-positive-50 rounded-lg px-3 py-2">{success}</p>}

            <div className="flex justify-end">
                <button type="submit" className="btn-primary text-sm" disabled={pending}>
                    {pending ? "Guardando..." : "Guardar supuestos"}
                </button>
            </div>
        </form>
    );
}

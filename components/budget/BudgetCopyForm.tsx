"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copyBudgetPlan } from "@/app/actions/budgets";

interface MonthOption {
    value: string;
    label: string;
}

interface BudgetCopyFormProps {
    targetMonth: string;
    sourceOptions: MonthOption[];
}

export function BudgetCopyForm({ targetMonth, sourceOptions }: BudgetCopyFormProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const defaultSource = useMemo(() => sourceOptions[0]?.value ?? "", [sourceOptions]);
    const [sourceMonth, setSourceMonth] = useState(defaultSource);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!sourceMonth) {
            setError("Selecciona un mes origen para copiar.");
            return;
        }

        startTransition(async () => {
            const result = await copyBudgetPlan({
                sourceMonth,
                targetMonth,
            });

            if (result.error) {
                setError(result.error);
                return;
            }

            setSuccess(`Plan copiado (${result.copiedCount ?? 0} categorías).`);
            router.refresh();
        });
    }

    if (sourceOptions.length === 0) {
        return (
            <div className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-4 text-sm text-surface-600">
                No hay meses anteriores con plan para copiar.
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[#d9e2f0] bg-white px-4 py-4">
            <p className="text-xs text-surface-500">
                Esto reemplaza el plan actual del mes destino por el plan del mes origen.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label className="label">Mes origen</label>
                    <select
                        className="input-field"
                        value={sourceMonth}
                        onChange={(event) => setSourceMonth(event.target.value)}
                        disabled={pending}
                    >
                        {sourceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="label">Mes destino</label>
                    <input className="input-field" value={targetMonth} disabled />
                </div>
            </div>

            {error && <p className="text-sm text-negative-600 bg-negative-50 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-positive-700 bg-positive-50 rounded-lg px-3 py-2">{success}</p>}

            <button type="submit" className="btn-secondary text-sm" disabled={pending}>
                {pending ? "Copiando..." : "Copiar plan al mes destino"}
            </button>
        </form>
    );
}

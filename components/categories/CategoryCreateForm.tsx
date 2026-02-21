"use client";

import { useState, useTransition } from "react";
import { createCategory } from "@/app/actions/categories";
import { useRouter } from "next/navigation";

const CATEGORY_KINDS = [
    { value: "income", label: "Ingreso personal" },
    { value: "expense", label: "Gasto personal" },
    { value: "transfer", label: "Transferencia" },
    { value: "revenue", label: "Ingreso de negocio" },
    { value: "cogs", label: "Costo de ventas" },
    { value: "opex", label: "Gasto operativo" },
    { value: "other_income", label: "Otro ingreso" },
    { value: "other_expense", label: "Otro gasto" },
    { value: "tax", label: "Impuestos" },
] as const;

export function CategoryCreateForm() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [kind, setKind] = useState<(typeof CATEGORY_KINDS)[number]["value"]>("expense");
    const [fixedCost, setFixedCost] = useState(false);
    const [variableCost, setVariableCost] = useState(true);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const result = await createCategory({
                name: name.trim(),
                kind,
                fixed_cost: fixedCost,
                variable_cost: variableCost,
            });

            if (result.error) {
                setError(result.error);
                return;
            }

            setSuccess("Categoría creada correctamente.");
            setName("");
            setKind("expense");
            setFixedCost(false);
            setVariableCost(true);
            router.refresh();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-200 bg-surface-50/60 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="label">Nombre de la categoría</label>
                    <input
                        className="input-field"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Ej. Alimentación, Ventas, Marketing"
                        required
                    />
                </div>
                <div>
                    <label className="label">Tipo</label>
                    <select
                        className="input-field"
                        value={kind}
                        onChange={(event) => setKind(event.target.value as (typeof CATEGORY_KINDS)[number]["value"])}
                    >
                        {CATEGORY_KINDS.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                    <input
                        type="checkbox"
                        checked={fixedCost}
                        onChange={(event) => setFixedCost(event.target.checked)}
                        className="h-4 w-4 rounded border-surface-300"
                    />
                    Marcar como costo fijo
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                    <input
                        type="checkbox"
                        checked={variableCost}
                        onChange={(event) => setVariableCost(event.target.checked)}
                        className="h-4 w-4 rounded border-surface-300"
                    />
                    Marcar como costo variable
                </label>
            </div>

            {error && <p className="text-sm text-negative-600 bg-negative-50 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-positive-700 bg-positive-50 rounded-lg px-3 py-2">{success}</p>}

            <div className="flex justify-end">
                <button type="submit" className="btn-primary text-sm" disabled={pending}>
                    {pending ? "Guardando..." : "Agregar categoría"}
                </button>
            </div>
        </form>
    );
}

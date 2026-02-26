"use client";

import { useMemo, useState, useTransition } from "react";
import { upsertBudget } from "@/app/actions/budgets";
import { useRouter } from "next/navigation";

interface BudgetSetFormProps {
    month: string;
    categories: Array<{ id: string; name: string }>;
}

export function BudgetSetForm({ month, categories }: BudgetSetFormProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const categoryOptions = useMemo(
        () =>
            [...categories].sort((a, b) =>
                a.name.localeCompare(b.name, "es", { sensitivity: "base" })
            ),
        [categories]
    );

    const [categoryId, setCategoryId] = useState(categoryOptions[0]?.id ?? "");
    const [amount, setAmount] = useState("");

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const result = await upsertBudget({
                month,
                category_gl_id: categoryId,
                amount: Number(amount),
            });

            if (result.error) {
                setError(result.error);
                return;
            }

            setSuccess("Presupuesto guardado correctamente.");
            setAmount("");
            router.refresh();
        });
    }

    if (categoryOptions.length === 0) {
        return (
            <div className="rounded-2xl border border-surface-200 bg-surface-50/60 p-4">
                <p className="text-sm text-muted">
                    No hay categorías disponibles para presupuestar. Crea categorías primero.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-200 bg-surface-50/60 p-4">
            <div className="rounded-xl border border-[#d9e7f2] bg-[#f5faff] px-3 py-2 text-xs text-surface-600">
                Regla rápida: define un tope realista por categoría. Luego registra tus movimientos y revisa si te mantienes dentro del plan.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="label">Mes</label>
                    <input className="input-field" value={month} disabled />
                </div>
                <div>
                    <label className="label">Categoría o rubro</label>
                    <select
                        className="input-field"
                        value={categoryId}
                        onChange={(event) => setCategoryId(event.target.value)}
                        required
                    >
                        {categoryOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="rounded-lg border border-[#b9c9de] bg-[#edf3fa] p-2">
                    <div className="flex items-center justify-between gap-2">
                        <label className="label mb-0">Tope mensual</label>
                        <span className="rounded-full border border-[#9db3ce] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1b4679]">
                            Campo clave
                        </span>
                    </div>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-field mt-1"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="Ej. 800"
                        required
                    />
                </div>
            </div>

            {error && <p className="text-sm text-negative-600 bg-negative-50 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-positive-700 bg-positive-50 rounded-lg px-3 py-2">{success}</p>}

            <div className="flex justify-end">
                <button type="submit" className="btn-primary text-sm" disabled={pending}>
                    {pending ? "Guardando..." : "Guardar tope mensual"}
                </button>
            </div>
        </form>
    );
}

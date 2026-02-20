"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createTransaction, updateTransaction } from "@/app/actions/transactions";
import { Select } from "@/components/ui/Select";
import { Account, CategoryGL } from "@/lib/types/finance";

interface TransactionFormInitialValues {
    date: string;
    description: string;
    amount: number;
    account_id: string;
    category_gl_id?: string | null;
    currency?: string | null;
    notes?: string | null;
}

interface TransactionFormProps {
    accounts: Account[];
    categories: CategoryGL[];
    mode?: "create" | "edit";
    transactionId?: string;
    initialValues?: TransactionFormInitialValues;
}

function toInputDate(value?: string) {
    if (!value) return new Date().toISOString().slice(0, 10);
    return value.slice(0, 10);
}

export function TransactionForm({
    accounts,
    categories,
    mode = "create",
    transactionId,
    initialValues,
}: TransactionFormProps) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [direction, setDirection] = useState<"outcome" | "income">(() => {
        if (!initialValues) return "outcome";
        return initialValues.amount >= 0 ? "income" : "outcome";
    });
    const [amount, setAmount] = useState(
        initialValues ? String(Math.abs(initialValues.amount)) : ""
    );
    const [description, setDescription] = useState(initialValues?.description ?? "");
    const [date, setDate] = useState(toInputDate(initialValues?.date));
    const [accountId, setAccountId] = useState(
        initialValues?.account_id || accounts[0]?.id || ""
    );
    const [categoryId, setCategoryId] = useState(initialValues?.category_gl_id ?? "");
    const [notes, setNotes] = useState(initialValues?.notes ?? "");

    const pageTitle = mode === "edit" ? "Editar transacción" : "Nueva transacción";
    const submitLabel = mode === "edit" ? "Guardar cambios" : "Crear transacción";

    const filteredCategories = useMemo(
        () =>
            categories.filter((category) => {
                if (direction === "income") {
                    return ["revenue", "other_income", "income"].includes(category.kind);
                }
                return !["revenue", "other_income", "income"].includes(category.kind);
            }),
        [categories, direction]
    );

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);
        setIsPending(true);

        try {
            const numericAmount = Number(amount);
            if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                throw new Error("Ingresa un monto válido.");
            }

            if (!accountId) {
                throw new Error("Selecciona una cuenta.");
            }

            const payload = {
                date,
                description: description.trim(),
                amount: direction === "outcome" ? -numericAmount : numericAmount,
                account_id: accountId,
                category_gl_id: categoryId || undefined,
                currency: (initialValues?.currency || "USD").toUpperCase(),
                is_transfer: false,
                counterparty_id: undefined,
                cost_center_id: undefined,
                transfer_group_id: undefined,
                detraccion_rate: undefined,
                detraccion_amount: undefined,
                notes: notes.trim() || undefined,
                tax_amount: undefined,
            };

            const result =
                mode === "edit" && transactionId
                    ? await updateTransaction(transactionId, payload)
                    : await createTransaction(payload);

            if (result.error) {
                throw new Error(result.error);
            }

            router.push("/dashboard/transactions");
            router.refresh();
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : "Ocurrió un error inesperado."
            );
        } finally {
            setIsPending(false);
        }
    }

    if (accounts.length === 0) {
        return (
            <div className="max-w-2xl mx-auto animate-fade-in">
                <div className="card p-6 text-center">
                    <h1 className="text-xl font-bold">No hay cuentas disponibles</h1>
                    <p className="text-muted mt-2">
                        Para registrar transacciones primero debes crear al menos una cuenta.
                    </p>
                    <Link href="/dashboard/accounts" className="btn-primary inline-flex mt-4 text-sm no-underline hover:text-white">
                        Ir a cuentas
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <Link
                href="/dashboard/transactions"
                className="inline-flex items-center gap-1 text-sm text-muted hover:text-surface-900 dark:hover:text-surface-100 mb-6 transition-colors"
            >
                Volver a transacciones
            </Link>

            <div className="card">
                <div className="p-6 border-b border-surface-100 dark:border-surface-800">
                    <h1 className="text-xl font-bold">{pageTitle}</h1>
                    <p className="text-sm text-muted mt-1">
                        {mode === "edit" ? "Actualiza la información del movimiento." : "Registra una transacción manual."}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-negative-50 text-negative-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Tipo</label>
                            <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setDirection("outcome")}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === "outcome"
                                        ? "bg-white dark:bg-surface-700 shadow-sm text-negative-600"
                                        : "text-muted hover:text-surface-900 dark:hover:text-surface-300"}`}
                                >
                                    Egreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDirection("income")}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === "income"
                                        ? "bg-white dark:bg-surface-700 shadow-sm text-positive-600"
                                        : "text-muted hover:text-surface-900 dark:hover:text-surface-300"}`}
                                >
                                    Ingreso
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-medium">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    className="input-field pl-7"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Descripción</label>
                            <input
                                type="text"
                                required
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                className="input-field"
                                placeholder="Ej. Compra de supermercado o cobro de servicio"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(event) => setDate(event.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <Select
                                label="Cuenta"
                                value={accountId}
                                onChange={(event) => setAccountId(event.target.value)}
                                required
                            >
                                <option value="" disabled>Selecciona una cuenta</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} ({account.currency})
                                    </option>
                                ))}
                            </Select>
                        </div>

                        <Select
                            label="Categoría"
                            value={categoryId}
                            onChange={(event) => setCategoryId(event.target.value)}
                        >
                            <option value="">Sin categoría</option>
                            {filteredCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Select>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Notas</label>
                            <textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                className="input-field min-h-[90px]"
                                placeholder="Opcional"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={isPending}
                            className="btn-ghost mr-2"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="btn-primary min-w-[130px]"
                        >
                            {isPending ? "Guardando..." : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

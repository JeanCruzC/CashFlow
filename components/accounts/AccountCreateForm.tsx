"use client";

import { useState, useTransition } from "react";
import { createAccount } from "@/app/actions/accounts";
import { useRouter } from "next/navigation";

const ACCOUNT_TYPES = [
    { value: "bank", label: "Cuenta bancaria" },
    { value: "cash", label: "Efectivo" },
    { value: "credit_card", label: "Tarjeta de crédito" },
    { value: "loan", label: "Préstamo" },
    { value: "investment", label: "Inversión" },
] as const;

export function AccountCreateForm() {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [accountType, setAccountType] = useState<(typeof ACCOUNT_TYPES)[number]["value"]>("bank");
    const [currency, setCurrency] = useState("USD");
    const [openingBalance, setOpeningBalance] = useState("0");
    const [creditLimit, setCreditLimit] = useState("");
    const [interestRate, setInterestRate] = useState("");

    function resetForm() {
        setName("");
        setAccountType("bank");
        setCurrency("USD");
        setOpeningBalance("0");
        setCreditLimit("");
        setInterestRate("");
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const result = await createAccount({
                name: name.trim(),
                account_type: accountType,
                currency: currency.trim().toUpperCase(),
                opening_balance: Number(openingBalance),
                credit_limit: creditLimit.trim() ? Number(creditLimit) : undefined,
                interest_rate_apr: interestRate.trim() ? Number(interestRate) : undefined,
            });

            if (result.error) {
                setError(result.error);
                return;
            }

            setSuccess("Cuenta creada correctamente.");
            resetForm();
            router.refresh();
        });
    }

    const showCreditFields = accountType === "credit_card" || accountType === "loan";

    return (
        <form onSubmit={handleSubmit} className="card p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="label">Nombre de la cuenta</label>
                    <input
                        className="input-field"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Ej. Banco principal"
                        required
                    />
                </div>
                <div>
                    <label className="label">Tipo de cuenta</label>
                    <select
                        className="input-field"
                        value={accountType}
                        onChange={(event) => setAccountType(event.target.value as (typeof ACCOUNT_TYPES)[number]["value"])}
                    >
                        {ACCOUNT_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="label">Moneda</label>
                    <input
                        className="input-field"
                        maxLength={3}
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                        placeholder="USD"
                        required
                    />
                </div>
                <div>
                    <label className="label">Saldo inicial</label>
                    <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={openingBalance}
                        onChange={(event) => setOpeningBalance(event.target.value)}
                        required
                    />
                </div>
                {showCreditFields ? (
                    <div>
                        <label className="label">Límite de crédito</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={creditLimit}
                            onChange={(event) => setCreditLimit(event.target.value)}
                            placeholder="Opcional"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="label">Tasa anual (%)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={interestRate}
                            onChange={(event) => setInterestRate(event.target.value)}
                            placeholder="Opcional"
                        />
                    </div>
                )}
            </div>

            {showCreditFields && (
                <div>
                    <label className="label">Tasa anual (%)</label>
                    <input
                        type="number"
                        step="0.01"
                        className="input-field"
                        value={interestRate}
                        onChange={(event) => setInterestRate(event.target.value)}
                        placeholder="Opcional"
                    />
                </div>
            )}

            {error && <p className="text-sm text-negative-600 bg-negative-50 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-positive-700 bg-positive-50 rounded-lg px-3 py-2">{success}</p>}

            <div className="flex justify-end">
                <button type="submit" className="btn-primary text-sm" disabled={pending}>
                    {pending ? "Guardando..." : "Agregar cuenta"}
                </button>
            </div>
        </form>
    );
}

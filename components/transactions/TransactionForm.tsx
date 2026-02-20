"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/app/actions/transactions";
import { Select } from "@/components/ui/Select";
import { Account, CategoryGL } from "@/lib/types/finance";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TransactionFormProps {
    accounts: Account[];
    categories: CategoryGL[];
}

export function TransactionForm({ accounts, categories }: TransactionFormProps) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [direction, setDirection] = useState<"outcome" | "income">("outcome");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [accountId, setAccountId] = useState(accounts[0]?.id || "");
    const [categoryId, setCategoryId] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsPending(true);

        try {
            const numericAmount = parseFloat(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) {
                throw new Error("Please enter a valid amount");
            }

            const finalAmount = direction === "outcome" ? -numericAmount : numericAmount;

            const result = await createTransaction({
                date,
                description,
                amount: finalAmount,
                account_id: accountId,
                category_gl_id: categoryId || undefined,
                currency: "USD",
                is_transfer: false,
                // Optional fields passed as undefined
                counterparty_id: undefined,
                cost_center_id: undefined,
                transfer_group_id: undefined,
                detraccion_rate: undefined,
                detraccion_amount: undefined,
                notes: undefined,
                tax_amount: undefined,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            router.push("/dashboard/transactions");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsPending(false);
        }
    }

    // Filter categories by valid kinds based on direction
    const filteredCategories = categories.filter(c => {
        if (direction === "income") return c.kind === "revenue" || c.kind === "other_income" || c.kind === "income";
        return c.kind !== "revenue" && c.kind !== "other_income" && c.kind !== "income";
    });

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <Link href="/dashboard/transactions" className="inline-flex items-center gap-1 text-sm text-muted hover:text-surface-900 dark:hover:text-surface-100 mb-6 transition-colors">
                <ArrowLeft size={16} /> Back to Transactions
            </Link>

            <div className="card">
                <div className="p-6 border-b border-surface-100 dark:border-surface-800">
                    <h1 className="text-xl font-bold">New Transaction</h1>
                    <p className="text-sm text-muted mt-1">Record a manual transaction</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-negative-50 text-negative-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {/* Amount and Direction */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Type</label>
                            <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setDirection("outcome")}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === "outcome"
                                            ? "bg-white dark:bg-surface-700 shadow-sm text-negative-600"
                                            : "text-muted hover:text-surface-900 dark:hover:text-surface-300"
                                        }`}
                                >
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDirection("income")}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === "income"
                                            ? "bg-white dark:bg-surface-700 shadow-sm text-positive-600"
                                            : "text-muted hover:text-surface-900 dark:hover:text-surface-300"
                                        }`}
                                >
                                    Income
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-medium">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="input-field pl-7"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Description</label>
                            <input
                                type="text"
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input-field"
                                placeholder="e.g. Grocery Store, Client Payment"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <Select
                                label="Account"
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select Account</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                                ))}
                            </Select>
                        </div>

                        <Select
                            label="Category"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                        >
                            <option value="">Uncategorized</option>
                            {filteredCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={isPending}
                            className="btn-ghost mr-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="btn-primary min-w-[100px]"
                        >
                            {isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Create Transaction"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

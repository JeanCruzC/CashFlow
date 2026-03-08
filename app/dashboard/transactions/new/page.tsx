import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { getSavingsGoals } from "@/app/actions/savings-goals";
import { TransactionForm } from "@/components/transactions/TransactionForm";

function sanitizeDate(value?: string) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date().toISOString().slice(0, 10);
    return value;
}

function sanitizeAmount(value?: string, direction?: string) {
    if (!value) return 0;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return direction === "expense" ? -numeric : numeric;
}

export default async function NewTransactionPage({
    searchParams,
}: {
    searchParams?: Promise<{
        date?: string;
        description?: string;
        amount?: string;
        direction?: string;
    }>;
}) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const [accounts, categories, savingsGoals] = await Promise.all([
        getAccounts(),
        getCategories(),
        getSavingsGoals(),
    ]);

    const initialDescription = resolvedSearchParams?.description?.trim() || "";
    const initialAmount = sanitizeAmount(
        resolvedSearchParams?.amount,
        resolvedSearchParams?.direction === "expense" ? "expense" : "income"
    );
    const hasPrefill = initialDescription.length > 0 || initialAmount !== 0;

    return (
        <TransactionForm
            accounts={accounts || []}
            categories={categories || []}
            savingsGoals={savingsGoals || []}
            initialValues={
                hasPrefill
                    ? {
                        date: sanitizeDate(resolvedSearchParams?.date),
                        description: initialDescription,
                        amount: initialAmount,
                        account_id: accounts?.[0]?.id || "",
                    }
                    : undefined
            }
        />
    );
}

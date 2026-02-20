import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default async function NewTransactionPage() {
    const [accounts, categories] = await Promise.all([
        getAccounts(),
        getCategories(),
    ]);

    if (!accounts || accounts.length === 0) {
        // Handle edge case: User has no accounts. 
        // Should probably redirect to create account or show message.
        // For now, let the form handle empty accounts gracefully or show alert.
    }

    return (
        <TransactionForm
            accounts={accounts || []}
            categories={categories || []}
        />
    );
}

import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { getSavingsGoals } from "@/app/actions/savings-goals";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default async function NewTransactionPage() {
    const [accounts, categories, savingsGoals] = await Promise.all([
        getAccounts(),
        getCategories(),
        getSavingsGoals(),
    ]);

    return (
        <TransactionForm
            accounts={accounts || []}
            categories={categories || []}
            savingsGoals={savingsGoals || []}
        />
    );
}

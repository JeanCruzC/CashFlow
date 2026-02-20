import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default async function NewTransactionPage() {
    const [accounts, categories] = await Promise.all([
        getAccounts(),
        getCategories(),
    ]);

    return (
        <TransactionForm
            accounts={accounts || []}
            categories={categories || []}
        />
    );
}

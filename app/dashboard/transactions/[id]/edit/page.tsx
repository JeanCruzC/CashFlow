import { getAccounts } from "@/app/actions/accounts";
import { getCategories } from "@/app/actions/categories";
import { getTransactionById } from "@/app/actions/transactions";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import Link from "next/link";

interface EditTransactionPageProps {
    params: { id: string };
}

export default async function EditTransactionPage({ params }: EditTransactionPageProps) {
    const { id } = params;

    const [accounts, categories, transaction] = await Promise.all([
        getAccounts(),
        getCategories(),
        getTransactionById(id),
    ]);

    if (!transaction) {
        return (
            <div className="max-w-2xl mx-auto animate-fade-in card p-8 text-center">
                <h1 className="text-xl font-semibold">Transacción no encontrada</h1>
                <p className="text-muted mt-2">
                    Puede que haya sido eliminada o que no tengas permisos para verla.
                </p>
                <Link href="/dashboard/transactions" className="btn-primary inline-flex mt-4 text-sm no-underline hover:text-white">
                    Volver al listado
                </Link>
            </div>
        );
    }

    return (
        <TransactionForm
            mode="edit"
            transactionId={transaction.id}
            accounts={accounts || []}
            categories={categories || []}
            initialValues={{
                date: transaction.date,
                description: transaction.description,
                amount: Number(transaction.amount),
                account_id: transaction.account_id,
                category_gl_id: transaction.category_gl_id,
                currency: transaction.currency,
                notes: transaction.notes,
            }}
        />
    );
}

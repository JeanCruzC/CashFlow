import { getAccounts } from "@/app/actions/accounts";
import { AccountCreateForm } from "@/components/accounts/AccountCreateForm";
import { Account } from "@/lib/types/finance";

function accountTypeLabel(type: Account["account_type"]) {
    const labels: Record<Account["account_type"], string> = {
        cash: "Efectivo",
        bank: "Banco",
        credit_card: "Tarjeta de crédito",
        loan: "Préstamo",
        investment: "Inversión",
    };

    return labels[type];
}

export default async function AccountsPage() {
    const accounts = (await getAccounts()) as Account[];

    const totalAssets = accounts
        .filter((a) => Number(a.opening_balance) > 0)
        .reduce((sum, a) => sum + Number(a.opening_balance), 0);

    const totalLiabilities = accounts
        .filter((a) => Number(a.opening_balance) < 0)
        .reduce((sum, a) => sum + Math.abs(Number(a.opening_balance)), 0);

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Cuentas</h1>
                    <p className="text-muted mt-1">Administra tus cuentas y su saldo inicial</p>
                </div>
            </div>

            <div className="mb-6">
                <AccountCreateForm />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="card p-4">
                    <p className="text-sm text-muted mb-1">Activos totales</p>
                    <p className="text-xl font-semibold amount-positive">
                        ${totalAssets.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-muted mb-1">Pasivos totales</p>
                    <p className="text-xl font-semibold amount-negative">
                        ${totalLiabilities.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-muted mb-1">Patrimonio neto</p>
                    <p className="text-xl font-semibold">
                        ${(totalAssets - totalLiabilities).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {accounts.length === 0 ? (
                <div className="card p-8 text-center">
                    <p className="text-sm text-muted">Todavía no hay cuentas registradas.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {accounts.map((account) => {
                        const balance = Number(account.opening_balance);
                        return (
                            <div key={account.id} className="card p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                                        <span className="text-brand-500 text-sm font-bold">
                                            {account.account_type === "bank"
                                                ? "B"
                                                : account.account_type === "credit_card"
                                                    ? "CC"
                                                    : account.account_type === "cash"
                                                        ? "C"
                                                        : account.account_type === "loan"
                                                            ? "L"
                                                            : "I"}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{account.name}</p>
                                        <p className="text-xs text-muted capitalize">
                                            {accountTypeLabel(account.account_type)}
                                        </p>
                                    </div>
                                </div>
                                <span className={`font-semibold ${balance >= 0 ? "amount-positive" : "amount-negative"}`}>
                                    {balance >= 0 ? "" : "-"}$
                                    {Math.abs(balance).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

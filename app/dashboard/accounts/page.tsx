import { getAccounts } from "@/app/actions/accounts";
import { Account } from "@/lib/types/finance";

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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Accounts</h1>
                    <p className="text-muted mt-1">Manage your financial accounts</p>
                </div>
                <button className="btn-primary text-sm opacity-60 cursor-not-allowed" disabled>
                    Add Account (Soon)
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="card p-4">
                    <p className="text-sm text-muted mb-1">Total Assets</p>
                    <p className="text-xl font-semibold amount-positive">
                        ${totalAssets.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-muted mb-1">Total Liabilities</p>
                    <p className="text-xl font-semibold amount-negative">
                        ${totalLiabilities.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="card p-4">
                    <p className="text-sm text-muted mb-1">Net Worth</p>
                    <p className="text-xl font-semibold">
                        ${(totalAssets - totalLiabilities).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {accounts.length === 0 ? (
                <div className="card p-8 text-center">
                    <p className="text-sm text-muted">No accounts found yet.</p>
                    <p className="text-xs text-muted mt-2">
                        Account creation UI will be enabled in upcoming iteration.
                    </p>
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
                                            {account.account_type.replace("_", " ")}
                                        </p>
                                    </div>
                                </div>
                                <span className={`font-semibold ${balance >= 0 ? "amount-positive" : "amount-negative"}`}>
                                    {balance >= 0 ? "" : "-"}$
                                    {Math.abs(balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

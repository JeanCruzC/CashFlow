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

function accountTag(type: Account["account_type"]) {
    if (type === "bank") return "BNK";
    if (type === "cash") return "CSH";
    if (type === "credit_card") return "CRD";
    if (type === "loan") return "LON";
    return "INV";
}

export default async function AccountsPage() {
    const accounts = (await getAccounts()) as Account[];

    const totalAssets = accounts
        .filter((account) => Number(account.opening_balance) > 0)
        .reduce((sum, account) => sum + Number(account.opening_balance), 0);

    const totalLiabilities = accounts
        .filter((account) => Number(account.opening_balance) < 0)
        .reduce((sum, account) => sum + Math.abs(Number(account.opening_balance)), 0);

    const netWorth = totalAssets - totalLiabilities;

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">Módulo base</p>
                <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Cuentas financieras</h2>
                <p className="mt-2 max-w-3xl text-sm text-surface-500">
                    Registra cuentas bancarias, efectivo, préstamos y tarjetas para construir patrimonio,
                    pasivos y saldos de control desde una sola estructura.
                </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Activos</p>
                    <p className="mt-1 text-2xl font-semibold text-positive-600">
                        {new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" }).format(totalAssets)}
                    </p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Pasivos</p>
                    <p className="mt-1 text-2xl font-semibold text-negative-600">
                        {new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" }).format(totalLiabilities)}
                    </p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Patrimonio neto</p>
                    <p className={`mt-1 text-2xl font-semibold ${netWorth >= 0 ? "text-[#0f2233]" : "text-negative-600"}`}>
                        {new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" }).format(netWorth)}
                    </p>
                </article>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Agregar cuenta</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Define moneda, tipo y saldo inicial para usarla en transacciones y reportes.
                </p>
                <div className="mt-4">
                    <AccountCreateForm />
                </div>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Listado de cuentas</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Estado actual de las cuentas activas dentro de la organización.
                </p>

                {accounts.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-6 text-center text-sm text-surface-500">
                        Todavía no hay cuentas registradas.
                    </div>
                ) : (
                    <div className="mt-4 divide-y rounded-2xl border border-surface-200">
                        {accounts.map((account) => {
                            const balance = Number(account.opening_balance);
                            return (
                                <article key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="inline-flex h-10 min-w-[44px] items-center justify-center rounded-xl border border-[#bfd7ec] bg-[#edf5fc] px-2 text-xs font-semibold text-[#0d4c7a]">
                                            {accountTag(account.account_type)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[#0f2233]">{account.name}</p>
                                            <p className="text-xs text-surface-500">
                                                {accountTypeLabel(account.account_type)} · {account.currency}
                                            </p>
                                        </div>
                                    </div>
                                    <p className={`text-sm font-semibold ${balance >= 0 ? "text-positive-600" : "text-negative-600"}`}>
                                        {new Intl.NumberFormat("es-PE", { style: "currency", currency: account.currency || "USD" }).format(balance)}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

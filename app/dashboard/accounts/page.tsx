import { getAccounts } from "@/app/actions/accounts";
import { getAccountBalances } from "@/app/actions/accounts";
import { getOrgSettings } from "@/app/actions/settings";
import Link from "next/link";
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
    const [accounts, balanceMap, orgSettings] = await Promise.all([
        getAccounts() as Promise<Account[]>,
        getAccountBalances(),
        getOrgSettings(),
    ]);
    const locale = orgSettings?.preferred_locale === "en" ? "en-US" : "es-PE";
    const baseCurrency = (orgSettings?.currency || accounts[0]?.currency || "USD").toUpperCase();
    const formatMoney = (
        value: number,
        currency: string = baseCurrency,
        minimumFractionDigits?: number
    ) =>
        new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            minimumFractionDigits,
        }).format(value);

    // Real balance = opening_balance + sum of all transactions for that account
    const getRealBalance = (account: Account) => {
        const txnSum = balanceMap[account.id] || 0;
        return Number(account.opening_balance) + txnSum;
    };

    const totalAssets = accounts
        .filter((account) => getRealBalance(account) > 0)
        .reduce((sum, account) => sum + getRealBalance(account), 0);

    const totalLiabilities = accounts
        .filter((account) => getRealBalance(account) < 0)
        .reduce((sum, account) => sum + Math.abs(getRealBalance(account)), 0);

    const netWorth = totalAssets - totalLiabilities;
    const hasAccounts = accounts.length > 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold text-[#0f2233]">Cuentas</h2>
                        <p className="mt-1 text-sm text-surface-500">
                            Este módulo muestra tu balance actual. La creación/edición de cuentas vive en Configuración.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href="/dashboard/settings#estructura-financiera" className="btn-secondary text-sm no-underline">
                            Administrar cuentas
                        </Link>
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            Registrar movimiento
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Activos</p>
                    <p className="mt-1 text-2xl font-semibold text-positive-600">
                        {formatMoney(totalAssets)}
                    </p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Pasivos</p>
                    <p className="mt-1 text-2xl font-semibold text-negative-600">
                        {formatMoney(totalLiabilities)}
                    </p>
                </article>
                <article className="rounded-2xl border border-surface-200 bg-white p-4 shadow-card">
                    <p className="text-sm text-surface-500">Patrimonio neto</p>
                    <p className={`mt-1 text-2xl font-semibold ${netWorth >= 0 ? "text-[#0f2233]" : "text-negative-600"}`}>
                        {formatMoney(netWorth)}
                    </p>
                </article>
            </section>

            {!hasAccounts && (
                <section className="rounded-3xl border border-[#d6e3f0] bg-[#f3f8fd] p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Aún no tienes cuentas activas</h3>
                    <p className="mt-1 text-sm text-surface-600">
                        Completa la estructura financiera para que el resumen refleje activos, pasivos y patrimonio.
                    </p>
                    <div className="mt-4">
                        <Link href="/dashboard/settings#estructura-financiera" className="btn-primary text-sm no-underline hover:text-white">
                            Ir a configuración de cuentas
                        </Link>
                    </div>
                </section>
            )}

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Cuentas de Efectivo y Bancos</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Tu dinero líquido disponible para usar.
                </p>

                {accounts.filter(a => a.account_type !== "credit_card" && a.account_type !== "loan").length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 px-4 py-6 text-center text-sm text-surface-500">
                        Todavía no hay cuentas registradas.
                    </div>
                ) : (
                    <div className="mt-4 divide-y rounded-2xl border border-surface-200">
                        {accounts.filter(a => a.account_type !== "credit_card" && a.account_type !== "loan").map((account) => {
                            const balance = getRealBalance(account);
                            return (
                                <article key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-50 transition-colors">
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
                                        {formatMoney(balance, account.currency || baseCurrency)}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {accounts.filter(a => a.account_type === "credit_card" || a.account_type === "loan").length > 0 && (
                <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Tarjetas de Crédito y Préstamos</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Límites de crédito, préstamos y estado de tus deudas actuales.
                    </p>

                    <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
                        {accounts.filter(a => a.account_type === "credit_card" || a.account_type === "loan").map((account) => {
                            const debt = Math.abs(getRealBalance(account));
                            const limit = Number(account.credit_limit) || 1; // prevent division by 0
                            const utilizationPercent = Math.min((debt / limit) * 100, 100);

                            // Visual color heuristics based on utilization
                            const progressColor = utilizationPercent > 85 ? "bg-negative-500" : utilizationPercent > 50 ? "bg-amber-500" : "bg-primary-500";

                            return (
                                <article key={account.id} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm hover:border-surface-300 transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="inline-flex h-10 min-w-[44px] items-center justify-center rounded-xl border border-negative-200 bg-negative-50 text-negative-600 px-2 text-xs font-semibold">
                                                {accountTag(account.account_type)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-[#0f2233]">{account.name}</p>
                                                <p className="text-xs text-surface-500">
                                                    {accountTypeLabel(account.account_type)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-negative-600">
                                            {formatMoney(-debt, account.currency || baseCurrency)}
                                        </p>
                                    </div>

                                    {account.account_type === "credit_card" && account.credit_limit && (
                                        <div className="space-y-1.5 mt-2">
                                            <div className="flex justify-between text-xs text-surface-500 font-medium">
                                                <span>Deuda: {formatMoney(debt, account.currency || baseCurrency, 0)}</span>
                                                <span>Límite: {formatMoney(Number(account.credit_limit), account.currency || baseCurrency, 0)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-surface-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${progressColor} transition-all duration-500`}
                                                    style={{ width: `${utilizationPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}

import Link from "next/link";
import { getAccounts, getAccountBalances } from "@/app/actions/accounts";
import { getOrgSettings } from "@/app/actions/settings";
import { Account } from "@/lib/types/finance";

function accountTypeLabel(type: Account["account_type"]) {
    const labels: Record<Account["account_type"], string> = {
        cash: "Efectivo",
        bank: "Cuenta bancaria",
        credit_card: "Tarjeta de crédito",
        loan: "Préstamo",
        investment: "Inversión",
    };
    return labels[type];
}

function strategyLabel(strategy: string | null | undefined) {
    if (strategy === "minimum") return "Pago mínimo";
    if (strategy === "fixed") return "Pago fijo";
    return "Pago total";
}

export default async function AccountsPage() {
    const [accounts, balanceMap, orgSettings] = await Promise.all([
        getAccounts() as Promise<Account[]>,
        getAccountBalances(),
        getOrgSettings(),
    ]);

    const locale = orgSettings?.preferred_locale === "en" ? "en-US" : "es-PE";
    const baseCurrency = (orgSettings?.currency || accounts[0]?.currency || "USD").toUpperCase();
    const formatMoney = (value: number, currency = baseCurrency) =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);

    const getRealBalance = (account: Account) => {
        const txnSum = balanceMap[account.id] || 0;
        return Number(account.opening_balance) + txnSum;
    };

    const assets = accounts
        .filter((account) => getRealBalance(account) >= 0)
        .reduce((sum, account) => sum + getRealBalance(account), 0);
    const liabilities = accounts
        .filter((account) => getRealBalance(account) < 0)
        .reduce((sum, account) => sum + Math.abs(getRealBalance(account)), 0);
    const netWorth = assets - liabilities;

    const liquidAccounts = accounts.filter(
        (account) => account.account_type === "cash" || account.account_type === "bank"
    );
    const debtAccounts = accounts.filter(
        (account) =>
            account.account_type === "credit_card" || account.account_type === "loan"
    );
    const investmentAccounts = accounts.filter(
        (account) => account.account_type === "investment"
    );

    return (
        <div className="space-y-7 animate-fade-in">
            <section className="rounded-3xl border border-[#d9e2f0] bg-white p-7 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-400">
                            Balance estructural
                        </p>
                        <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Cuentas y balance</h2>
                        <p className="mt-2 max-w-3xl text-sm text-surface-600">
                            Aquí ves el estado consolidado de tus cuentas. Altas y ajustes se hacen en Configuración.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/dashboard/settings#estructura-financiera"
                            className="btn-secondary text-sm no-underline"
                        >
                            Administrar estructura
                        </Link>
                        <Link
                            href="/dashboard/transactions/new"
                            className="btn-primary text-sm no-underline hover:text-white"
                        >
                            Registrar movimiento
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Activos</p>
                    <p className="mt-2 text-2xl font-semibold text-positive-600">{formatMoney(assets)}</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Pasivos</p>
                    <p className="mt-2 text-2xl font-semibold text-negative-600">{formatMoney(liabilities)}</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">Patrimonio neto</p>
                    <p
                        className={`mt-2 text-2xl font-semibold ${
                            netWorth >= 0 ? "text-[#0f2233]" : "text-negative-600"
                        }`}
                    >
                        {formatMoney(netWorth)}
                    </p>
                </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <article className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Cuentas líquidas</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Efectivo y bancos disponibles para operar.
                    </p>

                    {liquidAccounts.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-5 text-sm text-surface-500">
                            No hay cuentas líquidas configuradas.
                        </div>
                    ) : (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-[#d9e2f0]">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead className="bg-[#f5f9ff]">
                                    <tr className="text-left text-surface-500">
                                        <th className="px-4 py-3 font-semibold">Cuenta</th>
                                        <th className="px-4 py-3 font-semibold">Tipo</th>
                                        <th className="px-4 py-3 font-semibold">Moneda</th>
                                        <th className="px-4 py-3 text-right font-semibold">Saldo actual</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-200 bg-white">
                                    {liquidAccounts.map((account) => (
                                        <tr key={account.id}>
                                            <td className="px-4 py-3 font-medium text-[#0f2233]">{account.name}</td>
                                            <td className="px-4 py-3 text-surface-600">{accountTypeLabel(account.account_type)}</td>
                                            <td className="px-4 py-3 text-surface-600">{account.currency}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-[#0f2233]">
                                                {formatMoney(getRealBalance(account), account.currency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </article>

                <article className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Deuda y compromisos</h3>
                    <p className="mt-1 text-sm text-surface-500">
                        Tarjetas y préstamos con su lógica de pago del ciclo.
                    </p>

                    {debtAccounts.length === 0 ? (
                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-5 text-sm text-surface-500">
                            No hay deudas registradas.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {debtAccounts.map((account) => (
                                <div
                                    key={account.id}
                                    className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-[#0f2233]">{account.name}</p>
                                            <p className="text-xs text-surface-500">
                                                {accountTypeLabel(account.account_type)} · {strategyLabel(account.card_payment_strategy)}
                                            </p>
                                        </div>
                                        <p className="text-sm font-semibold text-negative-600">
                                            {formatMoney(getRealBalance(account), account.currency)}
                                        </p>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
                                        <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                            <p className="text-surface-500">Línea de crédito</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {account.credit_limit
                                                    ? formatMoney(Number(account.credit_limit), account.currency)
                                                    : "No definido"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                            <p className="text-surface-500">Vencimiento</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {account.payment_day ? `Día ${account.payment_day}` : "No definido"}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                            <p className="text-surface-500">Pago mínimo configurado</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {account.minimum_payment_amount
                                                    ? formatMoney(Number(account.minimum_payment_amount), account.currency)
                                                    : "No definido"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </article>
            </section>

            {investmentAccounts.length > 0 && (
                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-[#10283b]">Inversiones</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {investmentAccounts.map((account) => (
                            <article
                                key={account.id}
                                className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-4"
                            >
                                <p className="font-semibold text-[#0f2233]">{account.name}</p>
                                <p className="mt-1 text-xs text-surface-500">{account.currency}</p>
                                <p className="mt-3 text-lg font-semibold text-[#0f2233]">
                                    {formatMoney(getRealBalance(account), account.currency)}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

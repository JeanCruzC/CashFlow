import Link from "next/link";
import { getAccounts, getAccountBalances } from "@/app/actions/accounts";
import { getOrgSettings } from "@/app/actions/settings";
import { ModuleHero } from "@/components/ui/ModuleHero";
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

function balanceTone(value: number) {
    if (value > 0) return "text-positive-600";
    if (value < 0) return "text-negative-600";
    return "text-surface-600";
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

    const assets = accounts
        .filter((account) => getRealBalance(account) >= 0)
        .reduce((sum, account) => sum + getRealBalance(account), 0);
    const liabilities = accounts
        .filter((account) => getRealBalance(account) < 0)
        .reduce((sum, account) => sum + Math.abs(getRealBalance(account)), 0);
    const netWorth = assets - liabilities;
    const leverageRatio = assets > 0 ? (liabilities / assets) * 100 : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <ModuleHero
                eyebrow="Soporte operativo · Balance"
                title="Mapa de cuentas"
                description="Vista consolidada de liquidez, deudas e inversiones para decidir pagos, transferencias y capacidad de ahorro."
                actions={
                    <>
                        <Link href="/dashboard/settings#estructura-financiera" className="btn-secondary text-sm no-underline">
                            Administrar estructura
                        </Link>
                        <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                            Registrar movimiento
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Resumen rapido
                        </p>
                        <div className="mt-4 space-y-2 text-sm">
                            <div className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-3 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-surface-500">Activos</span>
                                    <span className="font-semibold text-positive-600">{formatMoney(assets)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-surface-500">Pasivos</span>
                                    <span className="font-semibold text-negative-600">{formatMoney(liabilities)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-surface-500">Patrimonio</span>
                                    <span className="font-semibold text-[#0f2233]">{formatMoney(netWorth)}</span>
                                </div>
                            </div>
                            <p className="text-xs text-surface-500">
                                Deuda sobre activos: <span className="font-semibold text-[#0f2233]">{leverageRatio.toFixed(1)}%</span>
                            </p>
                        </div>
                    </>
                }
            />

            <section className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Activos</p>
                    <p className="mt-2 text-3xl font-semibold text-positive-600">{formatMoney(assets)}</p>
                    <p className="mt-1 text-xs text-surface-400">Liquidez + inversiones + saldos positivos.</p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Pasivos</p>
                    <p className="mt-2 text-3xl font-semibold text-negative-600">{formatMoney(liabilities)}</p>
                    <p className="mt-1 text-xs text-surface-400">
                        Ratio deuda/activos: {leverageRatio.toFixed(1)}%
                    </p>
                </article>
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-5 shadow-card">
                    <p className="text-xs font-medium text-surface-500">Patrimonio neto</p>
                    <p className={`mt-2 text-3xl font-semibold ${netWorth >= 0 ? "text-[#0f2233]" : "text-negative-600"}`}>
                        {formatMoney(netWorth)}
                    </p>
                    <p className="mt-1 text-xs text-surface-400">Activos menos pasivos consolidados.</p>
                </article>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[#10283b]">Liquidez disponible</h3>
                        <span className="rounded-full border border-[#d9e2f0] bg-[#f5f9ff] px-3 py-1 text-xs font-semibold text-surface-500">
                            {liquidAccounts.length} cuentas
                        </span>
                    </div>

                    {liquidAccounts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                            No hay cuentas líquidas configuradas.
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {liquidAccounts.map((account) => {
                                const balance = getRealBalance(account);

                                return (
                                    <article key={account.id} className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-4">
                                        <p className="text-sm font-semibold text-[#0f2233]">{account.name}</p>
                                        <p className="mt-1 text-xs text-surface-500">
                                            {accountTypeLabel(account.account_type)} · {account.currency}
                                        </p>
                                        <p className={`mt-4 text-xl font-semibold ${balanceTone(balance)}`}>
                                            {formatMoney(balance, account.currency)}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {investmentAccounts.length > 0 && (
                        <div className="mt-6 border-t border-[#e6edf7] pt-5">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-[#10283b]">Inversiones</h4>
                                <span className="text-xs text-surface-500">{investmentAccounts.length} activos</span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {investmentAccounts.map((account) => {
                                    const balance = getRealBalance(account);

                                    return (
                                        <article key={account.id} className="rounded-xl border border-[#d9e2f0] bg-white p-4">
                                            <p className="text-sm font-semibold text-[#0f2233]">{account.name}</p>
                                            <p className="mt-1 text-xs text-surface-500">{account.currency}</p>
                                            <p className={`mt-3 text-lg font-semibold ${balanceTone(balance)}`}>
                                                {formatMoney(balance, account.currency)}
                                            </p>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </article>

                <article className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[#10283b]">Deuda y compromisos</h3>
                        <span className="rounded-full border border-[#d9e2f0] bg-[#fff5f5] px-3 py-1 text-xs font-semibold text-negative-600">
                            {debtAccounts.length} obligaciones
                        </span>
                    </div>

                    {debtAccounts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                            No hay deudas registradas.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {debtAccounts.map((account) => {
                                const balance = getRealBalance(account);

                                return (
                                    <article key={account.id} className="rounded-xl border border-[#f0d6cd] bg-[#fff9f7] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-[#0f2233]">{account.name}</p>
                                                <p className="mt-0.5 text-xs text-surface-500">
                                                    {accountTypeLabel(account.account_type)} · {strategyLabel(account.card_payment_strategy)}
                                                </p>
                                            </div>
                                            <p className="text-sm font-semibold text-negative-600">
                                                {formatMoney(balance, account.currency)}
                                            </p>
                                        </div>

                                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                            <div className="rounded-lg border border-[#f1ddd7] bg-white px-2.5 py-2">
                                                <p className="text-surface-500">Límite</p>
                                                <p className="mt-1 font-semibold text-[#0f2233]">
                                                    {account.credit_limit
                                                        ? formatMoney(Number(account.credit_limit), account.currency)
                                                        : "No definido"}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-[#f1ddd7] bg-white px-2.5 py-2">
                                                <p className="text-surface-500">Vencimiento</p>
                                                <p className="mt-1 font-semibold text-[#0f2233]">
                                                    {account.payment_day ? `Día ${account.payment_day}` : "No definido"}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-[#f1ddd7] bg-white px-2.5 py-2">
                                                <p className="text-surface-500">Pago mínimo</p>
                                                <p className="mt-1 font-semibold text-[#0f2233]">
                                                    {account.minimum_payment_amount
                                                        ? formatMoney(Number(account.minimum_payment_amount), account.currency)
                                                        : "No definido"}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </article>
            </section>

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Inventario completo de cuentas</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Referencia rápida de todas las cuentas activas con su saldo operativo.
                </p>

                {accounts.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-[#d9e2f0] bg-[#f8fbff] px-4 py-6 text-sm text-surface-500">
                        Todavía no tienes cuentas activas.
                    </div>
                ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {accounts.map((account) => {
                            const balance = getRealBalance(account);

                            return (
                                <article key={account.id} className="rounded-xl border border-[#d9e2f0] bg-[#fbfdff] p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold text-[#0f2233]">{account.name}</p>
                                            <p className="mt-0.5 text-xs text-surface-500">
                                                {accountTypeLabel(account.account_type)} · {account.currency}
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-[#d9e2f0] bg-white px-2 py-0.5 text-[11px] font-semibold text-surface-500">
                                            {account.is_active ? "Activa" : "Inactiva"}
                                        </span>
                                    </div>
                                    <p className={`mt-4 text-lg font-semibold ${balanceTone(balance)}`}>
                                        {formatMoney(balance, account.currency)}
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

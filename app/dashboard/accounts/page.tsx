import Link from "next/link";
import { getAccounts, getAccountBalances, getPartnerContribution } from "@/app/actions/accounts";
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

function normalizeLabel(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

export default async function AccountsPage() {
    const [accounts, balanceMap, orgSettings, partnerContribution] = await Promise.all([
        getAccounts() as Promise<Account[]>,
        getAccountBalances(),
        getOrgSettings(),
        getPartnerContribution(),
    ]);

    const locale = orgSettings?.preferred_locale === "en" ? "en-US" : "es-PE";
    const baseCurrency = (orgSettings?.currency || accounts[0]?.currency || "USD").toUpperCase();
    const formatMoney = (value: number, currency = baseCurrency) =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);

    const hasSharedPartnerAccount = accounts.some((account) => {
        const normalizedName = normalizeLabel(account.name);
        return normalizedName.includes("cuenta compartida") || normalizedName.includes("shared account");
    });

    const accountRows =
        partnerContribution > 0 && !hasSharedPartnerAccount
            ? [
                ...accounts,
                {
                    id: "virtual-partner-shared-account",
                    org_id: accounts[0]?.org_id || "virtual",
                    name: "Cuenta compartida (pareja)",
                    account_type: "bank",
                    currency: baseCurrency,
                    opening_balance: partnerContribution,
                    credit_limit: null,
                    interest_rate_apr: null,
                    payment_day: null,
                    card_payment_strategy: null,
                    minimum_payment_amount: null,
                    is_restricted_cash: false,
                    is_active: true,
                    created_at: new Date().toISOString(),
                } satisfies Account,
            ]
            : accounts;

    const getRealBalance = (account: Account) => {
        const txnSum = balanceMap[account.id] || 0;
        return Number(account.opening_balance) + txnSum;
    };

    const liquidAccounts = accountRows.filter(
        (account) => account.account_type === "cash" || account.account_type === "bank"
    );
    const debtAccounts = accountRows.filter(
        (account) =>
            account.account_type === "credit_card" || account.account_type === "loan"
    );
    const investmentAccounts = accountRows.filter(
        (account) => account.account_type === "investment"
    );

    const assets = accountRows
        .filter((account) => getRealBalance(account) >= 0)
        .reduce((sum, account) => sum + getRealBalance(account), 0);
    const liabilities = accountRows
        .filter((account) => getRealBalance(account) < 0)
        .reduce((sum, account) => sum + Math.abs(getRealBalance(account)), 0);
    const netWorth = assets - liabilities;
    const leverageRatio = assets > 0 ? (liabilities / assets) * 100 : 0;

    return (
        <div className="min-h-screen">
            <ModuleHero
                eyebrow="CONFIGURACIÓN · CUENTAS"
                title="Tus cuentas y saldos"
                description="Cuánto tienes hoy, cuánto debes y estructura financiera"
                actions={
                    <>
                        <Link href="/dashboard/settings#estructura-financiera" className="h-btn1 no-underline">
                            Administrar estructura
                        </Link>
                        <Link href="/dashboard/transactions/new" className="h-btn2 no-underline">
                            Registrar movimiento
                        </Link>
                    </>
                }
                rightPanel={
                    <>
                        <div className="h-stat"><div className="h-stat-lbl"><span className="h-dot" style={{ background: "#5effd5" }}></span>Activos</div><div className="h-stat-n" style={{ color: "#5effd5" }}>{formatMoney(assets)}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl"><span className="h-dot" style={{ background: "#ffb3bc" }}></span>Pasivos</div><div className="h-stat-n" style={{ color: "#ffb3bc" }}>{formatMoney(liabilities)}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl"><span className="h-dot" style={{ background: "rgba(255,255,255,.5)" }}></span>Patrimonio</div><div className="h-stat-n" style={{ color: "#fff" }}>{formatMoney(netWorth)}</div></div>
                    </>
                }
            >
                {formatMoney(assets)}
            </ModuleHero>

            {/* Stat Cards */}
            <div className="g3 fu in" style={{ transitionDelay: ".06s" }}>
                <div className="stat-card"><div className="stat-badge sb-info">Informativo</div><div className="stat-n ok">{formatMoney(assets)}</div><div className="stat-desc">Activos — liquidez + inversiones + saldos positivos</div></div>
                <div className="stat-card"><div className="stat-badge sb-ng">Crítico</div><div className="stat-n ng">{formatMoney(liabilities)}</div><div className="stat-desc">Pasivos — ratio deuda/activos: {leverageRatio.toFixed(1)}%</div></div>
                <div className="stat-card"><div className="stat-badge sb-ok">Seguimiento</div><div className="stat-n a">{formatMoney(netWorth)}</div><div className="stat-desc">Patrimonio neto — activos menos pasivos consolidados</div></div>
            </div>

            {/* Account Cards Grid */}
            <div className="g2 fu in" style={{ transitionDelay: ".1s" }}>
                <div className="card">
                    <div className="card-head"><div><div className="card-title">Liquidez disponible</div></div><div className="card-action">{liquidAccounts.length} cuentas</div></div>
                    {liquidAccounts.length === 0 ? (
                        <div className="table-empty">No hay cuentas líquidas configuradas.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {liquidAccounts.map((account) => {
                                const balance = getRealBalance(account);
                                return (
                                    <div key={account.id} className="acc-card">
                                        <div className="acc-type">{accountTypeLabel(account.account_type)} · {account.currency}</div>
                                        <div className="acc-name">{account.name}</div>
                                        <div className="acc-sub">Saldo operativo diario</div>
                                        <div className={`acc-balance ${balance >= 0 ? "pos" : "neg"}`}>{formatMoney(balance, account.currency)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {investmentAccounts.length > 0 && (
                        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--brd)" }}>
                            <div className="card-head"><div className="card-title">Inversiones</div><div className="card-action">{investmentAccounts.length} activos</div></div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {investmentAccounts.map((account) => {
                                    const balance = getRealBalance(account);
                                    return (
                                        <div key={account.id} className="acc-card">
                                            <div className="acc-type">Inversión · {account.currency}</div>
                                            <div className="acc-name">{account.name}</div>
                                            <div className={`acc-balance ${balance >= 0 ? "pos" : "neg"}`}>{formatMoney(balance, account.currency)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="card-head"><div><div className="card-title">Deuda y compromisos</div></div><div className="card-action">{debtAccounts.length} obligaciones</div></div>
                    {debtAccounts.length === 0 ? (
                        <div className="table-empty">No hay deudas registradas.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {debtAccounts.map((account) => {
                                const balance = getRealBalance(account);
                                return (
                                    <div key={account.id} className="acc-card" style={{ borderColor: "rgba(255,71,87,.2)" }}>
                                        <div className="acc-type" style={{ color: "var(--ng)" }}>{accountTypeLabel(account.account_type)} · {account.currency}</div>
                                        <div className="acc-name">{account.name}</div>
                                        <div className="acc-sub">{strategyLabel(account.card_payment_strategy)}</div>
                                        <div className="acc-balance neg">{formatMoney(balance, account.currency)}</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--brd)" }}>
                                            <div><div style={{ fontSize: "10px", color: "var(--tx2)", marginBottom: "3px" }}>Límite</div><div style={{ fontSize: "12.5px", fontWeight: 700 }}>{account.credit_limit ? formatMoney(Number(account.credit_limit), account.currency) : "No definido"}</div></div>
                                            <div><div style={{ fontSize: "10px", color: "var(--tx2)", marginBottom: "3px" }}>Vencimiento</div><div style={{ fontSize: "12.5px", fontWeight: 700 }}>{account.payment_day ? `Día ${account.payment_day}` : "No definido"}</div></div>
                                            <div><div style={{ fontSize: "10px", color: "var(--tx2)", marginBottom: "3px" }}>Pago mínimo</div><div style={{ fontSize: "12.5px", fontWeight: 700, color: account.minimum_payment_amount ? "var(--tx)" : "var(--tx3)" }}>{account.minimum_payment_amount ? formatMoney(Number(account.minimum_payment_amount), account.currency) : "No definido"}</div></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Full Table */}
            <div className="table-wrap fu in" style={{ transitionDelay: ".15s" }}>
                {accountRows.length === 0 ? (
                    <div className="table-empty">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                        Todavía no tienes cuentas activas.
                    </div>
                ) : (
                    <>
                        <table className="table-v">
                            <thead><tr><th>CUENTA</th><th>TIPO</th><th>MONEDA</th><th>SALDO OPERATIVO</th><th>PRIORIDAD</th><th>ESTADO</th></tr></thead>
                            <tbody>
                                {accountRows.map((account) => {
                                    const balance = getRealBalance(account);
                                    const isDebt = (account.account_type === "credit_card" || account.account_type === "loan") && balance < 0;
                                    const isInv = account.account_type === "investment";
                                    return (
                                        <tr key={account.id}>
                                            <td style={{ fontWeight: 700 }}>{account.name}</td>
                                            <td style={{ color: "var(--tx2)" }}>{accountTypeLabel(account.account_type)}</td>
                                            <td><span className="ptag if">{account.currency}</span></td>
                                            <td><span className={`${balance >= 0 ? "pos" : "neg"}`} style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: "14px" }}>{formatMoney(balance, account.currency)}</span></td>
                                            <td><span className={`ptag ${isDebt ? "cr" : isInv ? "sg" : "if"}`}>{isDebt ? "Crítico" : isInv ? "Seguimiento" : "Informativo"}</span></td>
                                            <td><span className="ptag sg">{account.is_active ? "ACTIVA" : "INACTIVA"}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}

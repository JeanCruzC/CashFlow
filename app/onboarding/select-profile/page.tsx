"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProfileOrganization } from "@/app/actions/onboarding";
import {
    ArrowRightIcon,
    BuildingIcon,
    SpinnerIcon,
    UserCircleIcon,
} from "@/components/ui/icons";

const CURRENCIES = ["USD", "EUR", "PEN", "MXN", "COP", "CLP", "ARS"];
const TIMEZONES = [
    "America/Lima",
    "America/Mexico_City",
    "America/Bogota",
    "America/Santiago",
    "America/Argentina/Buenos_Aires",
    "America/New_York",
    "Europe/Madrid",
];
const COUNTRIES = [
    { code: "PE", label: "Perú" },
    { code: "MX", label: "México" },
    { code: "CO", label: "Colombia" },
    { code: "CL", label: "Chile" },
    { code: "AR", label: "Argentina" },
    { code: "US", label: "Estados Unidos" },
    { code: "ES", label: "España" },
];

export default function SelectProfilePage() {
    const router = useRouter();
    const [selected, setSelected] = useState<"personal" | "business" | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [orgName, setOrgName] = useState("");
    const [country, setCountry] = useState("PE");
    const [currency, setCurrency] = useState("USD");
    const [timezone, setTimezone] = useState("America/Lima");
    const [preferredLocale, setPreferredLocale] = useState<"es" | "en">("es");

    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [accountName, setAccountName] = useState("Cuenta principal");
    const [accountType, setAccountType] = useState<"bank" | "cash" | "credit_card" | "loan" | "investment">("bank");
    const [openingBalance, setOpeningBalance] = useState("0");

    const [legalName, setLegalName] = useState("");
    const [taxId, setTaxId] = useState("");
    const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState("1");
    const [accountingBasis, setAccountingBasis] = useState<"cash_basis" | "accrual_basis">("accrual_basis");
    const [detraccionesEnabled, setDetraccionesEnabled] = useState(false);
    const [revenueGrowthRate, setRevenueGrowthRate] = useState("5");
    const [cogsPercent, setCogsPercent] = useState("40");
    const [fixedOpex, setFixedOpex] = useState("0");
    const [variableOpexPercent, setVariableOpexPercent] = useState("15");
    const [oneOffAmount, setOneOffAmount] = useState("0");

    const title = useMemo(() => {
        if (selected === "business") return "Configura tu organización empresarial";
        if (selected === "personal") return "Configura tu espacio personal";
        return "Selecciona el perfil financiero";
    }, [selected]);

    async function handleContinue() {
        if (!selected || loading) return;
        setLoading(true);
        setError("");

        try {
            if (!orgName.trim()) {
                throw new Error("Ingresa un nombre para tu organización.");
            }

            const shared = {
                orgName: orgName.trim(),
                country,
                currency,
                timezone,
                preferredLocale,
            };

            const payload =
                selected === "personal"
                    ? {
                        ...shared,
                        startDate,
                        firstAccount: {
                            name: accountName.trim() || "Cuenta principal",
                            accountType,
                            openingBalance: Number(openingBalance || "0"),
                            currency,
                        },
                    }
                    : {
                        ...shared,
                        legalName: legalName.trim() || orgName.trim(),
                        taxId: taxId.trim() || undefined,
                        fiscalYearStartMonth: Number(fiscalYearStartMonth),
                        accountingBasis,
                        detraccionesEnabled,
                        forecast: {
                            revenueGrowthRate: Number(revenueGrowthRate || "0"),
                            cogsPercent: Number(cogsPercent || "0"),
                            fixedOpex: Number(fixedOpex || "0"),
                            variableOpexPercent: Number(variableOpexPercent || "0"),
                            oneOffAmount: Number(oneOffAmount || "0"),
                            note: "Inicializado desde onboarding",
                        },
                    };

            const result = await createProfileOrganization(selected, payload);
            if (result.error) throw new Error(result.error);

            router.replace("/dashboard");
            router.refresh();
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : "No se pudo crear el perfil."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(165deg,#f7fbff_0%,#edf5fb_48%,#f9fcfd_100%)] px-5 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto w-full max-w-5xl space-y-6 animate-fade-in">
                <section className="rounded-3xl border border-surface-200 bg-white px-6 py-6 shadow-card sm:px-8 sm:py-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d4c7a]">
                        Onboarding
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-[#0f2233]">{title}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-surface-500">
                        Cada organización en CashFlow es de un solo tipo: personal o empresa. Este paso
                        deja listo tu entorno con parámetros reales para operar desde el dashboard.
                    </p>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => {
                            setSelected("personal");
                            if (!orgName.trim()) setOrgName("Mis Finanzas");
                        }}
                        className={`rounded-2xl border bg-white p-5 text-left shadow-card transition-all ${selected === "personal"
                                ? "border-[#0d4c7a] shadow-glow"
                                : "border-surface-200 hover:border-surface-300"
                            }`}
                    >
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f1fa] text-[#0d4c7a]">
                            <UserCircleIcon size={20} />
                        </div>
                        <h2 className="text-lg font-semibold text-[#10283b]">Perfil personal</h2>
                        <p className="mt-1 text-sm text-surface-500">
                            Flujo de caja, presupuesto mensual, patrimonio neto y metas de ahorro.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setSelected("business");
                            if (!orgName.trim()) setOrgName("Mi Negocio");
                        }}
                        className={`rounded-2xl border bg-white p-5 text-left shadow-card transition-all ${selected === "business"
                                ? "border-[#0d4c7a] shadow-glow"
                                : "border-surface-200 hover:border-surface-300"
                            }`}
                    >
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f1fa] text-[#0d4c7a]">
                            <BuildingIcon size={20} />
                        </div>
                        <h2 className="text-lg font-semibold text-[#10283b]">Perfil empresa</h2>
                        <p className="mt-1 text-sm text-surface-500">
                            Revenue, COGS, OPEX, EBIT, margen operativo, presupuesto y forecast.
                        </p>
                    </button>
                </section>

                {selected && (
                    <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card sm:p-8">
                        <h3 className="text-xl font-semibold text-[#10283b]">Configuración base</h3>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="lg:col-span-3">
                                <label className="label">Nombre del workspace</label>
                                <input
                                    className="input-field"
                                    value={orgName}
                                    onChange={(event) => setOrgName(event.target.value)}
                                    placeholder={selected === "business" ? "Mi Negocio SAC" : "Mis Finanzas"}
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">País</label>
                                <select
                                    className="input-field"
                                    value={country}
                                    onChange={(event) => setCountry(event.target.value)}
                                >
                                    {COUNTRIES.map((entry) => (
                                        <option key={entry.code} value={entry.code}>
                                            {entry.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Moneda base</label>
                                <select
                                    className="input-field"
                                    value={currency}
                                    onChange={(event) => setCurrency(event.target.value)}
                                >
                                    {CURRENCIES.map((code) => (
                                        <option key={code} value={code}>
                                            {code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Zona horaria</label>
                                <select
                                    className="input-field"
                                    value={timezone}
                                    onChange={(event) => setTimezone(event.target.value)}
                                >
                                    {TIMEZONES.map((tz) => (
                                        <option key={tz} value={tz}>
                                            {tz}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Idioma</label>
                                <select
                                    className="input-field"
                                    value={preferredLocale}
                                    onChange={(event) => setPreferredLocale(event.target.value as "es" | "en")}
                                >
                                    <option value="es">Español</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>

                        {selected === "personal" ? (
                            <div className="mt-7 space-y-4">
                                <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
                                    Estructura personal inicial
                                </h4>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <label className="label">Fecha de inicio</label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={startDate}
                                            onChange={(event) => setStartDate(event.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Cuenta inicial</label>
                                        <input
                                            className="input-field"
                                            value={accountName}
                                            onChange={(event) => setAccountName(event.target.value)}
                                            placeholder="Cuenta principal"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Tipo de cuenta</label>
                                        <select
                                            className="input-field"
                                            value={accountType}
                                            onChange={(event) => setAccountType(event.target.value as "bank" | "cash" | "credit_card" | "loan" | "investment")}
                                        >
                                            <option value="bank">Banco</option>
                                            <option value="cash">Efectivo</option>
                                            <option value="credit_card">Tarjeta de crédito</option>
                                            <option value="loan">Préstamo</option>
                                            <option value="investment">Inversión</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Saldo inicial</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="input-field"
                                            value={openingBalance}
                                            onChange={(event) => setOpeningBalance(event.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-7 space-y-6">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
                                        Identidad contable
                                    </h4>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="sm:col-span-2">
                                            <label className="label">Razón social</label>
                                            <input
                                                className="input-field"
                                                value={legalName}
                                                onChange={(event) => setLegalName(event.target.value)}
                                                placeholder="CashFlow Labs SAC"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Tax ID</label>
                                            <input
                                                className="input-field"
                                                value={taxId}
                                                onChange={(event) => setTaxId(event.target.value)}
                                                placeholder="RUC / NIT / RFC"
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Inicio fiscal</label>
                                            <select
                                                className="input-field"
                                                value={fiscalYearStartMonth}
                                                onChange={(event) => setFiscalYearStartMonth(event.target.value)}
                                            >
                                                {Array.from({ length: 12 }, (_, i) => (
                                                    <option key={i + 1} value={String(i + 1)}>
                                                        Mes {i + 1}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Base contable</label>
                                            <select
                                                className="input-field"
                                                value={accountingBasis}
                                                onChange={(event) => setAccountingBasis(event.target.value as "cash_basis" | "accrual_basis")}
                                            >
                                                <option value="accrual_basis">Devengado (Accrual)</option>
                                                <option value="cash_basis">Efectivo (Cash)</option>
                                            </select>
                                        </div>
                                        <label className="mt-2 inline-flex items-center gap-2 text-sm text-surface-700">
                                            <input
                                                type="checkbox"
                                                checked={detraccionesEnabled}
                                                onChange={(event) => setDetraccionesEnabled(event.target.checked)}
                                                className="h-4 w-4 rounded border-surface-300"
                                            />
                                            Activar flujo de detracciones
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-surface-500">
                                        Supuestos de forecast inicial
                                    </h4>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                        <div>
                                            <label className="label">Growth %</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="input-field"
                                                value={revenueGrowthRate}
                                                onChange={(event) => setRevenueGrowthRate(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">COGS %</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="input-field"
                                                value={cogsPercent}
                                                onChange={(event) => setCogsPercent(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Fixed OPEX</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="input-field"
                                                value={fixedOpex}
                                                onChange={(event) => setFixedOpex(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Variable OPEX %</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="input-field"
                                                value={variableOpexPercent}
                                                onChange={(event) => setVariableOpexPercent(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">One-off</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="input-field"
                                                value={oneOffAmount}
                                                onChange={(event) => setOneOffAmount(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error ? (
                            <div className="mt-5 rounded-xl border border-negative-200 bg-negative-50 px-3 py-2 text-sm text-negative-700">
                                {error}
                            </div>
                        ) : null}

                        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-surface-500">
                                Podrás ajustar todos estos datos luego en Configuración y módulos internos.
                            </p>
                            <button
                                type="button"
                                onClick={handleContinue}
                                disabled={!selected || loading}
                                className="btn-primary min-w-[220px]"
                            >
                                <span className="inline-flex items-center justify-center gap-2">
                                    {loading ? <SpinnerIcon size={14} /> : <ArrowRightIcon size={14} />}
                                    Crear organización y continuar
                                </span>
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProfileOrganization } from "@/app/actions/onboarding";
import {
    ArrowRightIcon,
    BuildingIcon,
    SpinnerIcon,
    UserCircleIcon,
} from "@/components/ui/icons";

const ArrowLeftIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CheckCircleIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 11.08V12C21.9988 14.1564 21.3001 16.2547 20.0093 17.9818C18.7185 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.88033 13.488 2.02808 11.3363C2.17583 9.18455 2.99721 7.13631 4.36421 5.49706C5.73121 3.85781 7.56837 2.71537 9.6006 2.23547C11.6328 1.75557 13.7505 1.96472 15.63 2.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CURRENCIES = ["USD", "EUR", "PEN", "MXN", "COP", "CLP", "ARS"];
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
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [selected, setSelected] = useState<"personal" | "business" | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Step 2: Basic info
    const [orgName, setOrgName] = useState("");
    const [country, setCountry] = useState("PE");
    const [currency, setCurrency] = useState("USD");

    // Step 3: Account (Personal) or Legal (Business)
    const [accountName, setAccountName] = useState("Cuenta principal");
    const [openingBalance, setOpeningBalance] = useState("0");
    const [legalName, setLegalName] = useState("");

    const handleNext = () => {
        if (step === 1 && !selected) return;
        if (step === 2 && !orgName.trim()) {
            setError("Debes ingresar un nombre para continuar.");
            return;
        }
        setError("");
        setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    };

    const handleBack = () => {
        setError("");
        setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
    };

    async function handleFinish() {
        if (!selected || loading) return;
        setLoading(true);
        setError("");

        try {
            const shared = {
                orgName: orgName.trim(),
                country,
                currency,
                timezone: "America/Lima", // simplified for onboarding
                preferredLocale: "es" as const, // simplified
            };

            const payload =
                selected === "personal"
                    ? {
                        ...shared,
                        startDate: new Date().toISOString().slice(0, 10),
                        firstAccount: {
                            name: accountName.trim() || "Cuenta principal",
                            accountType: "bank" as const, // simplified
                            openingBalance: Number(openingBalance || "0"),
                            currency,
                        },
                    }
                    : {
                        ...shared,
                        legalName: legalName.trim() || orgName.trim(),
                        fiscalYearStartMonth: 1, // simplified
                        accountingBasis: "accrual_basis" as const, // simplified
                        detraccionesEnabled: false,
                        forecast: {
                            revenueGrowthRate: 5,
                            cogsPercent: 40,
                            fixedOpex: 0,
                            variableOpexPercent: 15,
                            oneOffAmount: 0,
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
                    : "No se pudo crear el entorno de trabajo."
            );
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(165deg,#f7fbff_0%,#edf5fb_48%,#f9fcfd_100%)] px-4 py-8 sm:px-8 sm:py-12 flex items-center justify-center">
            <div className="w-full max-w-2xl animate-fade-in relative">

                {/* Progress Bar */}
                <div className="mb-8 flex items-center justify-center gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className={`h-2.5 rounded-full transition-all duration-300 ${step === i ? "w-12 bg-[#0d4c7a]" : step > i ? "w-6 bg-[#0d4c7a]/40" : "w-6 bg-surface-200"
                                }`}
                        />
                    ))}
                </div>

                <div className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card sm:p-10 relative overflow-hidden">

                    {/* Step Tracker Background Number */}
                    <div className="absolute -top-6 -right-4 text-[120px] font-black text-surface-50 opacity-40 select-none pointer-events-none">
                        {step}
                    </div>

                    <div className="relative z-10 w-full transition-all duration-300">
                        {/* ================= STEP 1: SELECT PROFILE ================= */}
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Bienvenido a CashFlow 👋</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Vamos a preparar tu entorno. Nos toma menos de un minuto. Una vez terminado,
                                        <strong className="text-[#0d4c7a]"> tu única tarea diaria será registrar tus transacciones.</strong>
                                    </p>
                                    <p className="mt-2 text-sm text-surface-500">¿Para qué usarás la plataforma?</p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelected("personal");
                                            if (!orgName) setOrgName("Mis Finanzas");
                                        }}
                                        className={`rounded-2xl border p-5 text-left transition-all ${selected === "personal"
                                            ? "border-[#0d4c7a] bg-[#f2f8fc] shadow-glow"
                                            : "border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50"
                                            }`}
                                    >
                                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0d4c7a] shadow-sm">
                                            <UserCircleIcon size={20} />
                                        </div>
                                        <h2 className="text-lg font-semibold text-[#10283b]">Uso Personal</h2>
                                        <p className="mt-1 text-sm text-surface-500">
                                            Controlar mi sueldo, gastos, ahorros y conocer mi patrimonio.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelected("business");
                                            if (!orgName) setOrgName("Mi Negocio");
                                        }}
                                        className={`rounded-2xl border p-5 text-left transition-all ${selected === "business"
                                            ? "border-[#0d4c7a] bg-[#f2f8fc] shadow-glow"
                                            : "border-surface-200 bg-white hover:border-surface-300 hover:bg-surface-50"
                                            }`}
                                    >
                                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0d4c7a] shadow-sm">
                                            <BuildingIcon size={20} />
                                        </div>
                                        <h2 className="text-lg font-semibold text-[#10283b]">Para mi Negocio</h2>
                                        <p className="mt-1 text-sm text-surface-500">
                                            Medir ingresos, costos operativos, rentabilidad y proyecciones.
                                        </p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ================= STEP 2: BASIC INFO ================= */}
                        {step === 2 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Los datos básicos</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        ¿Cómo se llama {selected === "personal" ? "tu entorno" : "tu empresa"} y cuál es tu moneda local?
                                    </p>
                                </div>

                                <div className="space-y-5 mt-6 border border-surface-200 bg-surface-50/50 p-5 rounded-2xl">
                                    <div>
                                        <label className="label text-sm text-[#0f2233]">Nombre (App visible)</label>
                                        <input
                                            className="input-field bg-white"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            placeholder={selected === "business" ? "Mi Negocio SAC" : "Mis Finanzas"}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">País de residencia</label>
                                            <select
                                                className="input-field bg-white"
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                            >
                                                {COUNTRIES.map((entry) => (
                                                    <option key={entry.code} value={entry.code}>{entry.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">Moneda en la que operas</label>
                                            <select
                                                className="input-field bg-white"
                                                value={currency}
                                                onChange={(e) => setCurrency(e.target.value)}
                                            >
                                                {CURRENCIES.map((code) => (
                                                    <option key={code} value={code}>{code}</option>
                                                ))}
                                            </select>
                                            <p className="mt-1.5 text-xs text-surface-500">Todo tu resumen se verá en esta moneda.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ================= STEP 3: ACCOUNTS ================= */}
                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">
                                        {selected === "personal" ? "Creando tu primera cuenta" : "Datos legales"}
                                    </h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        {selected === "personal"
                                            ? "Una cuenta en CashFlow es el lugar físico o digital donde está tu dinero (ej. Banco BCP, Efectivo, Tarjeta de crédito). Necesitamos registrar al menos una para empezar a operar."
                                            : "Para que el control de tu negocio sea preciso, necesitamos el nombre legal."}
                                    </p>
                                </div>

                                {selected === "personal" ? (
                                    <div className="space-y-5 mt-6 border border-[#b8d8f0] bg-[#edf6fd] p-5 rounded-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="bg-white p-2 rounded-lg text-[#0d4c7a] shadow-sm">
                                                <BuildingIcon size={20} />
                                            </div>
                                            <h3 className="font-semibold text-[#0d4c7a]">Cuenta Financiera Inicial</h3>
                                        </div>
                                        <div>
                                            <label className="label text-[#0d4c7a]">Nombre de la cuenta</label>
                                            <input
                                                className="input-field bg-white border-[#b8d8f0]"
                                                value={accountName}
                                                onChange={(e) => setAccountName(e.target.value)}
                                                placeholder="Ej: Banco BCP o Billetera en Efectivo"
                                            />
                                        </div>
                                        <div>
                                            <label className="label text-[#0d4c7a]">Saldo actual (¿Cuánto dinero hay hoy en esa cuenta?)</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-surface-400">{currency}</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input-field bg-white pl-12 border-[#b8d8f0]"
                                                    value={openingBalance}
                                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                                />
                                            </div>
                                            <p className="mt-1.5 text-xs text-[#0d4c7a]/80">
                                                Si no sabes el monto exacto ahora, pon 0. Podrás editarlo o agregar más cuentas después.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5 mt-6 border border-surface-200 bg-surface-50/50 p-5 rounded-2xl">
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">Razón Social (Nombre legal para contratos/facturas)</label>
                                            <input
                                                className="input-field bg-white"
                                                value={legalName}
                                                onChange={(e) => setLegalName(e.target.value)}
                                                placeholder="CashFlow Labs SAC"
                                            />
                                            <p className="mt-1.5 text-xs text-surface-500">
                                                Internamente crearemos tu &quot;Caja/Banco&quot; inicial para que puedas operar de inmediato.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ================= STEP 4: CATEGORIES ================= */}
                        {step === 4 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-positive-200 bg-positive-50 px-3 py-1 text-sm font-semibold text-positive-700 mb-4">
                                        <CheckCircleIcon size={16} /> Último paso
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Clasificando tu dinero</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Cada vez que registres un movimiento (ej. compramos comida), debes decirle al sistema en qué <strong>Categoría</strong> fue para que los resúmenes funcionen. ¡No te preocupes! <strong className="text-[#117068]">Ya creamos las más importantes para ti.</strong>
                                    </p>
                                </div>

                                <div className="mt-6 rounded-2xl border border-[#bedfd8] bg-[#edf9f6] p-5">
                                    <h3 className="text-sm font-semibold text-[#117068] mb-3">Categorías creadas automáticamente:</h3>

                                    {selected === "personal" ? (
                                        <ul className="space-y-2 text-sm text-[#117068]">
                                            <li className="flex items-center gap-2">🟢 <strong>Ingresos:</strong> Sueldo, Freelance, Inversiones</li>
                                            <li className="flex items-center gap-2">🔴 <strong>Gastos:</strong> Vivienda, Alimentación, Transporte, Salud</li>
                                            <li className="flex items-center gap-2">🔵 <strong>Transferencias:</strong> Movimientos entre tus mismas cuentas</li>
                                        </ul>
                                    ) : (
                                        <ul className="space-y-2 text-sm text-[#117068]">
                                            <li className="flex items-center gap-2">🟢 <strong>Ingresos (Ventas):</strong> Venta de productos, Servicios</li>
                                            <li className="flex items-center gap-2">🟠 <strong>Costos (COGS):</strong> Materiales directos, Licencias (lo indispensable para vender)</li>
                                            <li className="flex items-center gap-2">🔴 <strong>Gastos (OPEX):</strong> Sueldos, Alquiler de oficina, Marketing, Software</li>
                                        </ul>
                                    )}

                                    <p className="mt-4 text-xs font-semibold text-[#117068]/80 uppercase tracking-widest border-t border-[#bedfd8] pt-3">
                                        Si alguna no encaja con tu vida o negocio, podrás editarla o crear nuevas desde el menú más adelante.
                                    </p>
                                </div>

                                {error && (
                                    <div className="mt-5 rounded-xl border border-negative-200 bg-negative-50 px-4 py-3 text-sm text-negative-700 font-medium">
                                        {error}
                                    </div>
                                )}
                            </div>
                        )}


                        {/* ================= BUTTON CONTROLS ================= */}
                        <div className="mt-10 flex items-center justify-between border-t border-surface-200 pt-6">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-800 transition-colors"
                                >
                                    <ArrowLeftIcon size={16} /> Atrás
                                </button>
                            ) : (
                                <div /> /* Empty div to push right side to the end */
                            )}

                            {step < 4 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={!selected}
                                    className="btn-primary min-w-[140px]"
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        Continuar <ArrowRightIcon size={14} />
                                    </span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleFinish}
                                    disabled={loading}
                                    className="btn-primary min-w-[220px] bg-[#117068] hover:bg-[#0d5952] border-none shadow-[0_4px_14px_0_rgba(17,112,104,0.39)] hover:shadow-[0_6px_20px_rgba(17,112,104,0.23)]"
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        {loading ? <SpinnerIcon size={16} /> : <CheckCircleIcon size={16} />}
                                        Finalizar y usar App
                                    </span>
                                </button>
                            )}
                        </div>

                    </div>
                </div>

                {step === 1 && (
                    <p className="mt-6 text-center text-xs font-medium text-surface-400">
                        CashFlowLabs ©️ 2026. Todos tus datos están seguros.
                    </p>
                )}
            </div>
        </div>
    );
}

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

const PlusIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SparklesIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4M3 5h4" />
    </svg>
);

const CheckCircleIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 11.08V12C21.9988 14.1564 21.3001 16.2547 20.0093 17.9818C18.7185 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.88033 13.488 2.02808 11.3363C2.17583 9.18455 2.99721 7.13631 4.36421 5.49706C5.73121 3.85781 7.56837 2.71537 9.6006 2.23547C11.6328 1.75557 13.7505 1.96472 15.63 2.82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowLeftIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const TrashIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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

    // Step 4: Custom Categories
    const [customCategories, setCustomCategories] = useState<{ name: string, kind: "income" | "expense" | "cost_of_goods_sold" }[]>([]);
    const [newCatName, setNewCatName] = useState("");
    const [newCatKind, setNewCatKind] = useState<"income" | "expense" | "cost_of_goods_sold">("expense");
    const [showAddCategory, setShowAddCategory] = useState(false);

    // Step 5: Initial Budgets & AI
    const [budgets, setBudgets] = useState<Record<string, string>>({});

    // AI Modal State
    const [aiCategory, setAiCategory] = useState<string | null>(null);
    const [aiContext, setAiContext] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<{ amount: number, reasoning: string } | null>(null);
    const [aiError, setAiError] = useState("");

    const handleNext = () => {
        if (step === 1 && !selected) return;
        if (step === 2 && !orgName.trim()) {
            setError("Debes ingresar un nombre para continuar.");
            return;
        }
        setError("");
        setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5);
    };

    const handleBack = () => {
        setError("");
        setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
    };

    const handleAddCategory = () => {
        if (!newCatName.trim()) return;
        setCustomCategories([...customCategories, { name: newCatName.trim(), kind: newCatKind }]);
        setNewCatName("");
        setShowAddCategory(false);
    };

    const handleRemoveCategory = (index: number) => {
        setCustomCategories(customCategories.filter((_, i) => i !== index));
    };

    const handleEstimateBudget = async () => {
        if (!aiContext.trim() || !aiCategory) return;
        setAiLoading(true);
        setAiError("");
        setAiResult(null);

        try {
            const countryName = COUNTRIES.find(c => c.code === country)?.label || country;
            const res = await fetch("/api/estimate-budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: aiCategory,
                    country: countryName,
                    currency,
                    context: aiContext
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error estimando presupuesto");

            setAiResult(data);
        } catch (e: unknown) {
            setAiError(e instanceof Error ? e.message : "Error desconocido");
        } finally {
            setAiLoading(false);
        }
    };

    const applyAiEstimate = () => {
        if (aiCategory && aiResult) {
            setBudgets({ ...budgets, [aiCategory]: aiResult.amount.toString() });
            setAiCategory(null);
            setAiContext("");
            setAiResult(null);
        }
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

            const initialBudgetsPayload = Object.entries(budgets)
                .filter((entry) => Number(entry[1]) > 0)
                .map(([categoryName, amount]) => ({
                    categoryName,
                    amount: Number(amount)
                }));

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
                        customCategories,
                        initialBudgets: initialBudgetsPayload
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
                        customCategories,
                        initialBudgets: initialBudgetsPayload
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

    // Default categories that will be generated in backend, used here for Budget UI step
    const defaultCategoriesForBudgets = selected === "personal"
        ? ["Vivienda", "Alimentación", "Transporte", "Salud"]
        : ["Operaciones", "Sueldos", "Marketing", "Software"];

    const activeBudgetCategories = [
        ...defaultCategoriesForBudgets,
        ...customCategories.filter(c => c.kind === "expense" || c.kind === "cost_of_goods_sold").map(c => c.name)
    ];

    return (
        <div className="min-h-screen bg-[linear-gradient(165deg,#f7fbff_0%,#edf5fb_48%,#f9fcfd_100%)] px-4 py-8 sm:px-8 sm:py-12 flex items-center justify-center">
            <div className="w-full max-w-2xl animate-fade-in relative">

                {/* Progress Bar */}
                <div className="mb-8 flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
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
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Clasificando tu dinero</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Cada vez que registres un movimiento, debes asignarle una <strong>Categoría</strong>. ¡Ya creamos las más importantes para ti! Si necesitas alguna específica que no esté aquí, puedes crearla ahora.
                                    </p>
                                </div>

                                <div className="mt-6 rounded-2xl border border-surface-200 bg-surface-50/50 p-5">
                                    <h3 className="text-sm font-semibold text-surface-700 mb-3">Principales categorías pre-configuradas:</h3>

                                    {selected === "personal" ? (
                                        <ul className="space-y-2 text-sm text-surface-600">
                                            <li className="flex items-center gap-2">🟢 <strong>Ingresos:</strong> Sueldo, Freelance, Inversiones</li>
                                            <li className="flex items-center gap-2">🔴 <strong>Gastos:</strong> Vivienda, Alimentación, Transporte, Salud</li>
                                        </ul>
                                    ) : (
                                        <ul className="space-y-2 text-sm text-surface-600">
                                            <li className="flex items-center gap-2">🟢 <strong>Ingresos:</strong> Venta de productos, Servicios</li>
                                            <li className="flex items-center gap-2">🔴 <strong>Egresos:</strong> Materiales, Licencias, Sueldos, Marketing</li>
                                        </ul>
                                    )}

                                    {/* Custom Categories List */}
                                    {customCategories.length > 0 && (
                                        <div className="mt-6 pt-4 border-t border-surface-200">
                                            <h3 className="text-sm font-semibold text-surface-700 mb-3">Tus categorías personalizadas:</h3>
                                            <ul className="space-y-2">
                                                {customCategories.map((c, idx) => (
                                                    <li key={idx} className="flex items-center justify-between text-sm bg-white border border-surface-200 rounded-lg px-3 py-2">
                                                        <span>{c.kind === "income" ? "🟢" : "🔴"} <strong>{c.name}</strong></span>
                                                        <button
                                                            onClick={() => handleRemoveCategory(idx)}
                                                            className="text-surface-400 hover:text-negative-600 p-1"
                                                        >
                                                            <TrashIcon size={16} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Add Custom Category Form */}
                                    <div className="mt-6 pt-5 border-t border-surface-200">
                                        {showAddCategory ? (
                                            <div className="bg-white p-4 rounded-xl border border-surface-300 shadow-sm animate-fade-in">
                                                <h4 className="text-sm font-medium mb-3">Nueva Categoría</h4>
                                                <div className="grid gap-3 sm:grid-cols-2 mb-3">
                                                    <div>
                                                        <input
                                                            className="input-field text-sm"
                                                            placeholder="Nombre (Ej. Suscripciones)"
                                                            value={newCatName}
                                                            onChange={e => setNewCatName(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div>
                                                        <select
                                                            className="input-field text-sm"
                                                            value={newCatKind}
                                                            onChange={e => setNewCatKind(e.target.value as "income" | "expense" | "cost_of_goods_sold")}
                                                        >
                                                            <option value="income">🟢 Es un Ingreso</option>
                                                            <option value="expense">🔴 Es un Gasto</option>
                                                            {selected === "business" && (
                                                                <option value="cost_of_goods_sold">🟠 Costo de Venta (COGS)</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => setShowAddCategory(false)}
                                                        className="px-3 py-1.5 text-sm font-medium text-surface-500 hover:text-surface-700"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={handleAddCategory}
                                                        disabled={!newCatName.trim()}
                                                        className="px-4 py-1.5 text-sm font-medium bg-[#0f2233] text-white rounded-lg disabled:opacity-50"
                                                    >
                                                        Guardar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddCategory(true)}
                                                className="w-full py-3 border border-dashed border-surface-300 rounded-xl text-sm font-medium text-surface-600 hover:bg-white hover:border-surface-400 transition flex items-center justify-center gap-2"
                                            >
                                                <PlusIcon size={16} /> Añadir categoría personalizada
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ================= STEP 5: BUDGET ================= */}
                        {step === 5 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-positive-200 bg-positive-50 px-3 py-1 text-sm font-semibold text-positive-700 mb-4">
                                        <CheckCircleIcon size={16} /> Último paso
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Tus Límites Mensuales</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        ¿Cuánto planeas gastar como máximo en estas categorías principales este mes?
                                        <strong> Si no deseas presupuestar alguna, simplemente déjala en 0.</strong>
                                    </p>
                                </div>

                                <div className="mt-6 rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                                    <div className="space-y-4">
                                        {activeBudgetCategories.map((cat, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-4 border-b border-surface-100 last:border-0 last:pb-0">
                                                <div className="flex flex-col sm:w-1/2">
                                                    <label className="text-sm font-medium text-surface-700">{cat}</label>
                                                    <button
                                                        onClick={() => { setAiCategory(cat); setAiContext(""); setAiResult(null); setAiError(""); }}
                                                        className="mt-1 flex items-center gap-1 w-fit text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors"
                                                    >
                                                        <SparklesIcon size={12} /> Sugerencia IA
                                                    </button>
                                                </div>
                                                <div className="relative w-full sm:w-1/2">
                                                    <span className="absolute left-3 top-2 text-surface-400 text-sm">{currency}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="10"
                                                        placeholder="0"
                                                        className="input-field pl-10 h-10 py-1 text-sm bg-surface-50 focus:bg-white"
                                                        value={budgets[cat] || ""}
                                                        onChange={(e) => setBudgets({ ...budgets, [cat]: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-5 text-xs text-surface-500 text-center">
                                        Tendrás control total de tu presupuesto y podrás agregar más limites directo en el Dashboard.
                                    </p>
                                </div>

                                {/* AI Estimation Modal / Popover */}
                                {aiCategory && (
                                    <div className="fixed inset-0 z-50 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                                            <div className="p-5 border-b border-surface-100 bg-purple-50 flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                                    <SparklesIcon size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-purple-900 leading-tight">Estimar presupuesto</h3>
                                                    <p className="text-xs font-medium text-purple-700/80">Para: {aiCategory}</p>
                                                </div>
                                            </div>

                                            <div className="p-5 space-y-4">
                                                {!aiResult && (
                                                    <>
                                                        <p className="text-sm text-surface-600">
                                                            Cuéntale a la IA más detalles para calcular un monto promedio mensual en {country}.
                                                        </p>
                                                        <textarea
                                                            placeholder={aiCategory.toLowerCase().includes("transporte") ? "Ej. Uso el bus de lunes a viernes y el tren los fines de semana..." : aiCategory.toLowerCase().includes("alimentación") ? "Ej. Somos 2 adultos que comemos en casa casi todos los días..." : "Escribe algunos detalles..."}
                                                            rows={3}
                                                            className="input-field text-sm w-full py-2 resize-none"
                                                            value={aiContext}
                                                            onChange={e => setAiContext(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </>
                                                )}

                                                {aiResult && (
                                                    <div className="bg-positive-50 border border-positive-100 p-4 rounded-xl space-y-3 animate-fade-in">
                                                        <div className="flex justify-between items-center pb-3 border-b border-positive-200">
                                                            <span className="text-sm font-medium text-positive-800">Cálculo estimado:</span>
                                                            <span className="text-lg font-bold text-positive-900">{currency} {aiResult.amount}</span>
                                                        </div>
                                                        <p className="text-sm text-positive-800 leading-relaxed italic">
                                                            &quot;{aiResult.reasoning}&quot;
                                                        </p>
                                                    </div>
                                                )}

                                                {aiError && (
                                                    <p className="text-sm text-negative-600 bg-negative-50 p-3 rounded-lg border border-negative-100">{aiError}</p>
                                                )}
                                            </div>

                                            <div className="p-4 bg-surface-50 border-t border-surface-100 flex justify-end gap-3">
                                                <button
                                                    onClick={() => setAiCategory(null)}
                                                    className="px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors"
                                                >
                                                    Cancelar
                                                </button>

                                                {!aiResult ? (
                                                    <button
                                                        onClick={handleEstimateBudget}
                                                        disabled={aiLoading || !aiContext.trim()}
                                                        className="btn-primary w-fit bg-purple-600 hover:bg-purple-700 border-none px-5 py-2 inline-flex items-center gap-2"
                                                    >
                                                        {aiLoading ? <SpinnerIcon size={16} /> : <SparklesIcon size={16} />}
                                                        Calcular estimado
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={applyAiEstimate}
                                                        className="btn-primary w-fit bg-[#0f2233] hover:bg-[#1a3a5c] px-5 py-2"
                                                    >
                                                        Utilizar este valor
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                            {step < 5 ? (
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

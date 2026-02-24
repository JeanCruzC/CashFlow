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

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type ProfileType = "personal" | "business";
type CategoryKind = "income" | "expense" | "cost_of_goods_sold";
type DistributionRule = "50_30_20" | "70_20_10" | "80_20" | "custom";
type SavingsPriority = "fixed_expenses" | "debt_payments" | "savings_goals";

const TOTAL_STEPS = 8;

const CURRENCIES = ["PEN", "USD", "EUR", "MXN", "COP", "CLP", "ARS"];
const COUNTRIES = [
    { code: "PE", label: "Perú", timezone: "America/Lima", currency: "PEN" },
    { code: "MX", label: "México", timezone: "America/Mexico_City", currency: "MXN" },
    { code: "CO", label: "Colombia", timezone: "America/Bogota", currency: "COP" },
    { code: "CL", label: "Chile", timezone: "America/Santiago", currency: "CLP" },
    { code: "AR", label: "Argentina", timezone: "America/Argentina/Buenos_Aires", currency: "ARS" },
    { code: "US", label: "Estados Unidos", timezone: "America/New_York", currency: "USD" },
    { code: "ES", label: "España", timezone: "Europe/Madrid", currency: "EUR" },
] as const;

const DISTRIBUTION_LABELS: Record<DistributionRule, string> = {
    "50_30_20": "50/30/20 - Necesidades / Deseos / Ahorro",
    "70_20_10": "70/20/10 - Gastos / Ahorro / Deuda o inversión",
    "80_20": "80/20 - Gastos / Ahorro",
    custom: "Personalizada",
};

const PRIORITY_LABELS: Record<SavingsPriority, string> = {
    fixed_expenses: "Cubrir gastos fijos",
    debt_payments: "Pagar deudas o tarjetas",
    savings_goals: "Aportar a metas de ahorro",
};

const PlusIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowLeftIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const TrashIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowUpIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ArrowDownIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 12L12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

function parseAmount(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(parsed, 0);
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

export default function SelectProfilePage() {
    const router = useRouter();

    const [step, setStep] = useState<OnboardingStep>(1);
    const [selected, setSelected] = useState<ProfileType | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [orgName, setOrgName] = useState("");
    const [country, setCountry] = useState("PE");
    const [currency, setCurrency] = useState("PEN");
    const [timezone, setTimezone] = useState("America/Lima");
    const [preferredLocale, setPreferredLocale] = useState<"es" | "en">("es");

    const [monthlyIncomeNet, setMonthlyIncomeNet] = useState("");
    const [hasAdditionalIncome, setHasAdditionalIncome] = useState(false);
    const [additionalIncome, setAdditionalIncome] = useState("");
    const [sharesFinances, setSharesFinances] = useState(false);
    const [partnerContribution, setPartnerContribution] = useState("");

    const [accountName, setAccountName] = useState("Cuenta principal");
    const [accountType, setAccountType] = useState<"cash" | "bank" | "credit_card" | "loan" | "investment">("bank");
    const [openingBalance, setOpeningBalance] = useState("0");
    const [legalName, setLegalName] = useState("");

    const [hasCreditCards, setHasCreditCards] = useState(false);
    const [creditCards, setCreditCards] = useState<Array<{ id: string; name: string; creditLimit: string; currentBalance: string }>>([]);

    const [customCategories, setCustomCategories] = useState<Array<{ name: string; kind: CategoryKind }>>([]);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [newCatKind, setNewCatKind] = useState<CategoryKind>("expense");

    const [budgets, setBudgets] = useState<Record<string, string>>({});

    const [distributionRule, setDistributionRule] = useState<DistributionRule>("50_30_20");
    const [customNeedsPct, setCustomNeedsPct] = useState("50");
    const [customWantsPct, setCustomWantsPct] = useState("30");
    const [customSavingsPct, setCustomSavingsPct] = useState("20");
    const [customDebtPct, setCustomDebtPct] = useState("0");

    const [savingsPriorities, setSavingsPriorities] = useState<SavingsPriority[]>([
        "fixed_expenses",
        "debt_payments",
        "savings_goals",
    ]);

    const [hasSavingsGoals, setHasSavingsGoals] = useState(false);
    const [savingsGoals, setSavingsGoals] = useState<Array<{ id: string; name: string; targetAmount: string; deadlineDate: string; goalWeight: string }>>([]);

    const consolidatedIncome = useMemo(() => {
        const base = parseAmount(monthlyIncomeNet);
        const extra = hasAdditionalIncome ? parseAmount(additionalIncome) : 0;
        const partner = sharesFinances ? parseAmount(partnerContribution) : 0;
        return round2(base + extra + partner);
    }, [monthlyIncomeNet, hasAdditionalIncome, additionalIncome, sharesFinances, partnerContribution]);

    const distribution = useMemo(() => {
        if (distributionRule === "50_30_20") {
            return { needsPct: 50, wantsPct: 30, savingsPct: 20, debtPct: 0 };
        }
        if (distributionRule === "70_20_10") {
            return { needsPct: 70, wantsPct: 0, savingsPct: 20, debtPct: 10 };
        }
        if (distributionRule === "80_20") {
            return { needsPct: 80, wantsPct: 0, savingsPct: 20, debtPct: 0 };
        }
        return {
            needsPct: parseAmount(customNeedsPct),
            wantsPct: parseAmount(customWantsPct),
            savingsPct: parseAmount(customSavingsPct),
            debtPct: parseAmount(customDebtPct),
        };
    }, [distributionRule, customNeedsPct, customWantsPct, customSavingsPct, customDebtPct]);

    const distributionTotal = round2(
        distribution.needsPct +
        distribution.wantsPct +
        distribution.savingsPct +
        distribution.debtPct
    );

    const distributionAmounts = useMemo(() => {
        return {
            needs: round2((consolidatedIncome * distribution.needsPct) / 100),
            wants: round2((consolidatedIncome * distribution.wantsPct) / 100),
            savings: round2((consolidatedIncome * distribution.savingsPct) / 100),
            debt: round2((consolidatedIncome * distribution.debtPct) / 100),
        };
    }, [consolidatedIncome, distribution]);

    const activeBudgetCategories = useMemo(() => {
        const defaults = selected === "business"
            ? ["Operaciones", "Sueldos", "Marketing", "Software"]
            : ["Vivienda", "Alimentación", "Transporte", "Salud"];
        const customExpenseNames = customCategories
            .filter((item) => item.kind === "expense" || item.kind === "cost_of_goods_sold")
            .map((item) => item.name);
        return [...defaults, ...customExpenseNames];
    }, [selected, customCategories]);

    const savingsPool = distributionAmounts.savings;
    const projectedGoalRows = useMemo(() => {
        const validGoals = savingsGoals
            .map((goal) => ({
                ...goal,
                targetAmountNum: parseAmount(goal.targetAmount),
                goalWeightNum: parseAmount(goal.goalWeight) || 1,
            }))
            .filter((goal) => goal.targetAmountNum > 0);

        const totalWeight = validGoals.reduce((sum, goal) => sum + goal.goalWeightNum, 0);

        return validGoals.map((goal) => {
            const projectedContribution =
                savingsPool > 0 && totalWeight > 0
                    ? round2((savingsPool * goal.goalWeightNum) / totalWeight)
                    : 0;
            const monthsToGoal =
                projectedContribution > 0
                    ? Math.ceil(goal.targetAmountNum / projectedContribution)
                    : null;
            return {
                ...goal,
                projectedContribution,
                monthsToGoal,
                percentOfIncome:
                    consolidatedIncome > 0
                        ? round2((projectedContribution / consolidatedIncome) * 100)
                        : 0,
            };
        });
    }, [savingsGoals, savingsPool, consolidatedIncome]);

    function handleCountryChange(value: string) {
        setCountry(value);
        const selectedCountry = COUNTRIES.find((item) => item.code === value);
        if (!selectedCountry) return;
        setTimezone(selectedCountry.timezone);
        setCurrency(selectedCountry.currency);
    }

    function movePriority(index: number, direction: "up" | "down") {
        setSavingsPriorities((previous) => {
            const next = [...previous];
            if (direction === "up" && index > 0) {
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
            }
            if (direction === "down" && index < next.length - 1) {
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
            }
            return next;
        });
    }

    function handleAddCategory() {
        if (!newCatName.trim()) return;
        setCustomCategories((previous) => [
            ...previous,
            { name: newCatName.trim(), kind: newCatKind },
        ]);
        setNewCatName("");
        setShowAddCategory(false);
    }

    function handleRemoveCategory(index: number) {
        setCustomCategories((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
    }

    function handleStepNext() {
        if (step === 1 && !selected) {
            setError("Selecciona un perfil para continuar.");
            return;
        }

        if (step === 2) {
            if (!orgName.trim()) {
                setError("Ingresa el nombre del workspace.");
                return;
            }
            if (selected === "personal" && parseAmount(monthlyIncomeNet) <= 0) {
                setError("Ingresa tu ingreso mensual neto para continuar.");
                return;
            }
        }

        if (step === 3 && selected === "personal" && !accountName.trim()) {
            setError("Define el nombre de tu cuenta inicial.");
            return;
        }

        if (step === 8 && selected === "personal" && distributionRule === "custom" && Math.abs(distributionTotal - 100) > 0.01) {
            setError("La distribución personalizada debe sumar 100%.");
            return;
        }

        setError("");
        setStep((previous) => Math.min(previous + 1, TOTAL_STEPS) as OnboardingStep);
    }

    function handleStepBack() {
        setError("");
        setStep((previous) => Math.max(previous - 1, 1) as OnboardingStep);
    }

    async function handleFinish() {
        if (!selected || loading) return;
        setLoading(true);
        setError("");

        try {
            const shared = {
                orgName: orgName.trim(),
                country,
                currency,
                timezone,
                preferredLocale,
            };

            const initialBudgetsPayload = Object.entries(budgets)
                .filter((entry) => Number(entry[1]) > 0)
                .map(([categoryName, amount]) => ({
                    categoryName,
                    amount: Number(amount),
                }));

            const creditCardsPayload = hasCreditCards
                ? creditCards
                    .map((card) => ({
                        name: card.name.trim() || "Tarjeta de crédito",
                        creditLimit: parseAmount(card.creditLimit),
                        currentBalance: parseAmount(card.currentBalance),
                    }))
                    .filter((card) => card.creditLimit > 0)
                : undefined;

            const savingsGoalsPayload = hasSavingsGoals
                ? savingsGoals
                    .map((goal) => ({
                        name: goal.name.trim() || "Meta de ahorro",
                        targetAmount: parseAmount(goal.targetAmount),
                        goalWeight: parseAmount(goal.goalWeight) || 1,
                        deadlineDate: goal.deadlineDate || null,
                    }))
                    .filter((goal) => goal.targetAmount > 0)
                : undefined;

            const financialProfilePayload = {
                monthlyIncomeNet: parseAmount(monthlyIncomeNet),
                additionalIncome: hasAdditionalIncome ? parseAmount(additionalIncome) : 0,
                partnerContribution: sharesFinances ? parseAmount(partnerContribution) : 0,
                distributionRule,
                customDistribution:
                    distributionRule === "custom"
                        ? {
                            needsPct: parseAmount(customNeedsPct),
                            wantsPct: parseAmount(customWantsPct),
                            savingsPct: parseAmount(customSavingsPct),
                            debtPct: parseAmount(customDebtPct),
                        }
                        : undefined,
                savingsPriorities,
            };

            const payload =
                selected === "personal"
                    ? {
                        ...shared,
                        startDate: new Date().toISOString().slice(0, 10),
                        firstAccount: {
                            name: accountName.trim() || "Cuenta principal",
                            accountType,
                            openingBalance: Number(openingBalance || "0"),
                            currency,
                        },
                        creditCards: creditCardsPayload,
                        savingsGoals: savingsGoalsPayload,
                        customCategories,
                        initialBudgets: initialBudgetsPayload,
                        financialProfile: financialProfilePayload,
                    }
                    : {
                        ...shared,
                        legalName: legalName.trim() || orgName.trim(),
                        fiscalYearStartMonth: 1,
                        accountingBasis: "accrual_basis" as const,
                        detraccionesEnabled: false,
                        forecast: {
                            revenueGrowthRate: 5,
                            cogsPercent: 40,
                            fixedOpex: 0,
                            variableOpexPercent: 15,
                            oneOffAmount: 0,
                            note: "Inicializado desde onboarding",
                        },
                        creditCards: creditCardsPayload,
                        savingsGoals: savingsGoalsPayload,
                        customCategories,
                        initialBudgets: initialBudgetsPayload,
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
        <div className="min-h-screen bg-[linear-gradient(165deg,#f7fbff_0%,#edf5fb_50%,#f9fcfd_100%)] px-4 py-8 sm:px-8 sm:py-12 flex items-center justify-center">
            <div className="w-full max-w-3xl animate-fade-in relative">
                <div className="mb-8 grid grid-cols-8 gap-2">
                    {Array.from({ length: TOTAL_STEPS }, (_, index) => {
                        const currentStep = index + 1;
                        return (
                            <div
                                key={currentStep}
                                className={`h-2.5 rounded-full transition-all ${step === currentStep
                                        ? "bg-[#0d4c7a]"
                                        : step > currentStep
                                            ? "bg-[#0d4c7a]/40"
                                            : "bg-surface-200"
                                    }`}
                            />
                        );
                    })}
                </div>

                <div className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card sm:p-10 relative overflow-hidden">
                    <div className="absolute -top-8 -right-4 text-[120px] font-black text-surface-50 opacity-40 select-none pointer-events-none">
                        {step}
                    </div>

                    <div className="relative z-10 w-full transition-all duration-300">
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Configura tu perfil financiero</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Cada organización en CashFlow es de un solo tipo: personal o empresa.
                                    </p>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelected("personal");
                                            if (!orgName) setOrgName("Mis Finanzas");
                                        }}
                                        className={`rounded-2xl border p-5 text-left transition-all ${selected === "personal"
                                                ? "border-[#0d4c7a] bg-[#f2f8fc] shadow-glow"
                                                : "border-surface-200 bg-white hover:border-surface-300"
                                            }`}
                                    >
                                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0d4c7a] shadow-sm">
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
                                            if (!orgName) setOrgName("Mi Negocio");
                                        }}
                                        className={`rounded-2xl border p-5 text-left transition-all ${selected === "business"
                                                ? "border-[#0d4c7a] bg-[#f2f8fc] shadow-glow"
                                                : "border-surface-200 bg-white hover:border-surface-300"
                                            }`}
                                    >
                                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0d4c7a] shadow-sm">
                                            <BuildingIcon size={20} />
                                        </div>
                                        <h2 className="text-lg font-semibold text-[#10283b]">Perfil empresa</h2>
                                        <p className="mt-1 text-sm text-surface-500">
                                            Revenue, COGS, OPEX, EBIT, margen operativo, presupuesto y forecast.
                                        </p>
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Configuración base e ingresos</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Esta información define tu bolsa mensual y sirve para proyectar metas reales.
                                    </p>
                                </div>

                                <div className="space-y-5 border border-surface-200 bg-surface-50/50 p-5 rounded-2xl">
                                    <div>
                                        <label className="label text-sm text-[#0f2233]">Nombre del workspace</label>
                                        <input
                                            className="input-field bg-white"
                                            value={orgName}
                                            onChange={(event) => setOrgName(event.target.value)}
                                            placeholder={selected === "business" ? "Mi Negocio SAC" : "Mis Finanzas"}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">País</label>
                                            <select
                                                className="input-field bg-white"
                                                value={country}
                                                onChange={(event) => handleCountryChange(event.target.value)}
                                            >
                                                {COUNTRIES.map((item) => (
                                                    <option key={item.code} value={item.code}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">Moneda base</label>
                                            <select
                                                className="input-field bg-white"
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
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">Zona horaria</label>
                                            <input
                                                className="input-field bg-white"
                                                value={timezone}
                                                onChange={(event) => setTimezone(event.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">Idioma</label>
                                            <select
                                                className="input-field bg-white"
                                                value={preferredLocale}
                                                onChange={(event) => setPreferredLocale(event.target.value as "es" | "en")}
                                            >
                                                <option value="es">Español</option>
                                                <option value="en">English</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {selected === "personal" && (
                                    <div className="space-y-5 border border-[#b8d8f0] bg-[#edf6fd] p-5 rounded-2xl">
                                        <h3 className="font-semibold text-[#0d4c7a]">Bolsa familiar e ingresos</h3>

                                        <div>
                                            <label className="label text-[#0d4c7a]">Ingreso mensual neto</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-[#0d4c7a]/70 text-sm">{currency}</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="input-field bg-white pl-12 border-[#b8d8f0]"
                                                    value={monthlyIncomeNet}
                                                    onChange={(event) => setMonthlyIncomeNet(event.target.value)}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="mt-1 h-4 w-4"
                                                checked={hasAdditionalIncome}
                                                onChange={(event) => setHasAdditionalIncome(event.target.checked)}
                                            />
                                            <span className="text-sm text-[#0f2233]">Tengo ingresos adicionales o variables</span>
                                        </label>

                                        {hasAdditionalIncome && (
                                            <div>
                                                <label className="label text-[#0d4c7a]">Ingreso adicional estimado mensual</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-[#0d4c7a]/70 text-sm">{currency}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="input-field bg-white pl-12 border-[#b8d8f0]"
                                                        value={additionalIncome}
                                                        onChange={(event) => setAdditionalIncome(event.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="mt-1 h-4 w-4"
                                                checked={sharesFinances}
                                                onChange={(event) => setSharesFinances(event.target.checked)}
                                            />
                                            <span className="text-sm text-[#0f2233]">Comparto finanzas y recibo aportes a la misma bolsa</span>
                                        </label>

                                        {sharesFinances && (
                                            <div>
                                                <label className="label text-[#0d4c7a]">Aporte mensual de pareja/familiar</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-[#0d4c7a]/70 text-sm">{currency}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="input-field bg-white pl-12 border-[#b8d8f0]"
                                                        value={partnerContribution}
                                                        onChange={(event) => setPartnerContribution(event.target.value)}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="rounded-xl border border-[#b8d8f0] bg-white px-4 py-3">
                                            <p className="text-xs uppercase tracking-[0.14em] text-[#0d4c7a]/70">Bolsa mensual consolidada</p>
                                            <p className="text-lg font-semibold text-[#0f2233]">
                                                {currency} {consolidatedIncome.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">
                                        {selected === "personal" ? "Estructura inicial" : "Datos legales de empresa"}
                                    </h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        {selected === "personal"
                                            ? "La cuenta inicial es el origen para saldo, patrimonio y conciliación de transacciones."
                                            : "Este dato permite identificar formalmente la organización en reportes y configuración."}
                                    </p>
                                </div>

                                {selected === "personal" ? (
                                    <div className="space-y-5 border border-surface-200 bg-surface-50/50 p-5 rounded-2xl">
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">Cuenta inicial</label>
                                            <input
                                                className="input-field bg-white"
                                                value={accountName}
                                                onChange={(event) => setAccountName(event.target.value)}
                                                placeholder="Cuenta principal"
                                            />
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="label text-sm text-[#0f2233]">Tipo de cuenta</label>
                                                <select
                                                    className="input-field bg-white"
                                                    value={accountType}
                                                    onChange={(event) =>
                                                        setAccountType(
                                                            event.target.value as "cash" | "bank" | "credit_card" | "loan" | "investment"
                                                        )
                                                    }
                                                >
                                                    <option value="bank">Banco</option>
                                                    <option value="cash">Efectivo</option>
                                                    <option value="investment">Inversión</option>
                                                    <option value="credit_card">Tarjeta de crédito</option>
                                                    <option value="loan">Préstamo</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="label text-sm text-[#0f2233]">Saldo inicial</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-surface-500 text-sm">{currency}</span>
                                                    <input
                                                        type="number"
                                                        className="input-field bg-white pl-12"
                                                        value={openingBalance}
                                                        onChange={(event) => setOpeningBalance(event.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="mt-1 h-4 w-4"
                                                checked={hasCreditCards}
                                                onChange={(event) => {
                                                    setHasCreditCards(event.target.checked);
                                                    if (event.target.checked && creditCards.length === 0) {
                                                        setCreditCards([
                                                            {
                                                                id: Date.now().toString(),
                                                                name: "",
                                                                creditLimit: "",
                                                                currentBalance: "",
                                                            },
                                                        ]);
                                                    }
                                                }}
                                            />
                                            <span className="text-sm text-[#0f2233]">Agregar tarjetas de crédito para controlar deuda desde el inicio</span>
                                        </label>

                                        {hasCreditCards && (
                                            <div className="space-y-3 border-t border-surface-200 pt-4">
                                                {creditCards.map((card, index) => (
                                                    <div key={card.id} className="rounded-xl border border-surface-200 bg-white p-4">
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <p className="text-sm font-semibold text-[#0f2233]">Tarjeta {index + 1}</p>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setCreditCards((previous) =>
                                                                        previous.filter((item) => item.id !== card.id)
                                                                    )
                                                                }
                                                                className="text-surface-400 hover:text-negative-600"
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                        </div>

                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <div className="sm:col-span-2">
                                                                <label className="label text-xs">Nombre</label>
                                                                <input
                                                                    className="input-field bg-surface-50"
                                                                    value={card.name}
                                                                    onChange={(event) => {
                                                                        setCreditCards((previous) => {
                                                                            const next = [...previous];
                                                                            next[index].name = event.target.value;
                                                                            return next;
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="label text-xs">Línea de crédito</label>
                                                                <input
                                                                    type="number"
                                                                    className="input-field bg-surface-50"
                                                                    value={card.creditLimit}
                                                                    onChange={(event) => {
                                                                        setCreditCards((previous) => {
                                                                            const next = [...previous];
                                                                            next[index].creditLimit = event.target.value;
                                                                            return next;
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="label text-xs">Deuda actual</label>
                                                                <input
                                                                    type="number"
                                                                    className="input-field bg-surface-50"
                                                                    value={card.currentBalance}
                                                                    onChange={(event) => {
                                                                        setCreditCards((previous) => {
                                                                            const next = [...previous];
                                                                            next[index].currentBalance = event.target.value;
                                                                            return next;
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setCreditCards((previous) => [
                                                            ...previous,
                                                            {
                                                                id: Date.now().toString(),
                                                                name: "",
                                                                creditLimit: "",
                                                                currentBalance: "",
                                                            },
                                                        ])
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-700 hover:bg-surface-100"
                                                >
                                                    <PlusIcon />
                                                    Añadir tarjeta
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-5 border border-surface-200 bg-surface-50/50 p-5 rounded-2xl">
                                        <div>
                                            <label className="label text-sm text-[#0f2233]">Razón social</label>
                                            <input
                                                className="input-field bg-white"
                                                value={legalName}
                                                onChange={(event) => setLegalName(event.target.value)}
                                                placeholder="CashFlow Labs SAC"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Categorías base</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Las categorías alimentan reportes, presupuesto y análisis de variación.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-surface-200 bg-surface-50/50 p-5">
                                    <p className="text-sm text-surface-600">
                                        {selected === "business"
                                            ? "Se crearán categorías empresariales de Revenue, COGS y OPEX."
                                            : "Se crearán categorías personales de ingreso, gasto y transferencias."}
                                    </p>

                                    {customCategories.length > 0 && (
                                        <ul className="mt-4 space-y-2">
                                            {customCategories.map((category, index) => (
                                                <li key={`${category.name}-${index}`} className="flex items-center justify-between rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
                                                    <span>
                                                        {category.name}
                                                        <span className="ml-2 text-surface-500">({category.kind})</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCategory(index)}
                                                        className="text-surface-400 hover:text-negative-600"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className="mt-4 border-t border-surface-200 pt-4">
                                        {showAddCategory ? (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <input
                                                    className="input-field bg-white"
                                                    placeholder="Nombre de categoría"
                                                    value={newCatName}
                                                    onChange={(event) => setNewCatName(event.target.value)}
                                                />
                                                <select
                                                    className="input-field bg-white"
                                                    value={newCatKind}
                                                    onChange={(event) => setNewCatKind(event.target.value as CategoryKind)}
                                                >
                                                    <option value="expense">Gasto</option>
                                                    <option value="income">Ingreso</option>
                                                    {selected === "business" && (
                                                        <option value="cost_of_goods_sold">COGS</option>
                                                    )}
                                                </select>
                                                <div className="sm:col-span-2 flex gap-2 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddCategory(false)}
                                                        className="px-3 py-2 text-sm text-surface-600"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddCategory}
                                                        className="btn-primary min-w-[130px]"
                                                    >
                                                        Guardar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowAddCategory(true)}
                                                className="inline-flex items-center gap-2 rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-700 hover:bg-white"
                                            >
                                                <PlusIcon />
                                                Añadir categoría personalizada
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Presupuesto inicial</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Define topes mensuales por categoría para activar el control Budget vs Actual.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-surface-200 bg-white p-5 space-y-4">
                                    {activeBudgetCategories.map((category) => (
                                        <div key={category} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-surface-100 pb-3 last:border-none last:pb-0">
                                            <label className="text-sm font-medium text-surface-700">{category}</label>
                                            <div className="relative w-full sm:w-64">
                                                <span className="absolute left-3 top-2.5 text-surface-500 text-sm">{currency}</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className="input-field bg-surface-50 pl-12"
                                                    value={budgets[category] || ""}
                                                    onChange={(event) =>
                                                        setBudgets((previous) => ({
                                                            ...previous,
                                                            [category]: event.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 6 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Metas de ahorro</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Define objetivos y te mostraremos la proyección usando tu regla de distribución.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-5">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-1 h-4 w-4"
                                            checked={hasSavingsGoals}
                                            onChange={(event) => {
                                                setHasSavingsGoals(event.target.checked);
                                                if (event.target.checked && savingsGoals.length === 0) {
                                                    setSavingsGoals([
                                                        {
                                                            id: Date.now().toString(),
                                                            name: "",
                                                            targetAmount: "",
                                                            deadlineDate: "",
                                                            goalWeight: "1",
                                                        },
                                                    ]);
                                                }
                                            }}
                                        />
                                        <span className="text-sm text-[#0f2233]">Quiero configurar metas de ahorro</span>
                                    </label>

                                    {hasSavingsGoals && (
                                        <div className="mt-4 space-y-4 border-t border-surface-200 pt-4">
                                            {savingsGoals.map((goal, index) => (
                                                <div key={goal.id} className="rounded-xl border border-surface-200 bg-white p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-semibold text-[#0f2233]">Meta {index + 1}</p>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSavingsGoals((previous) =>
                                                                    previous.filter((item) => item.id !== goal.id)
                                                                )
                                                            }
                                                            className="text-surface-400 hover:text-negative-600"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>

                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <div className="sm:col-span-2">
                                                            <label className="label text-xs">Nombre de la meta</label>
                                                            <input
                                                                className="input-field bg-surface-50"
                                                                value={goal.name}
                                                                onChange={(event) => {
                                                                    setSavingsGoals((previous) => {
                                                                        const next = [...previous];
                                                                        next[index].name = event.target.value;
                                                                        return next;
                                                                    });
                                                                }}
                                                                placeholder="Inicial de departamento"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="label text-xs">Monto objetivo ({currency})</label>
                                                            <input
                                                                type="number"
                                                                className="input-field bg-surface-50"
                                                                value={goal.targetAmount}
                                                                onChange={(event) => {
                                                                    setSavingsGoals((previous) => {
                                                                        const next = [...previous];
                                                                        next[index].targetAmount = event.target.value;
                                                                        return next;
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="label text-xs">Peso de prioridad</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="input-field bg-surface-50"
                                                                value={goal.goalWeight}
                                                                onChange={(event) => {
                                                                    setSavingsGoals((previous) => {
                                                                        const next = [...previous];
                                                                        next[index].goalWeight = event.target.value;
                                                                        return next;
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="label text-xs">Fecha límite (opcional)</label>
                                                            <input
                                                                type="date"
                                                                className="input-field bg-surface-50"
                                                                value={goal.deadlineDate}
                                                                onChange={(event) => {
                                                                    setSavingsGoals((previous) => {
                                                                        const next = [...previous];
                                                                        next[index].deadlineDate = event.target.value;
                                                                        return next;
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSavingsGoals((previous) => [
                                                        ...previous,
                                                        {
                                                            id: Date.now().toString(),
                                                            name: "",
                                                            targetAmount: "",
                                                            deadlineDate: "",
                                                            goalWeight: "1",
                                                        },
                                                    ])
                                                }
                                                className="inline-flex items-center gap-2 rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-700 hover:bg-white"
                                            >
                                                <PlusIcon />
                                                Agregar meta
                                            </button>
                                        </div>
                                    )}
                                </div>


                            </div>
                        )}

                        {step === 7 && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Prioridad del ahorro</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Define el orden que seguirá CashFlow cuando la bolsa sea limitada.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-surface-200 bg-white p-5 space-y-3">
                                    {savingsPriorities.map((priority, index) => (
                                        <div key={priority} className="flex items-center justify-between rounded-xl border border-surface-200 px-4 py-3">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.1em] text-surface-500">Prioridad {index + 1}</p>
                                                <p className="text-sm font-semibold text-[#0f2233]">{PRIORITY_LABELS[priority]}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => movePriority(index, "up")}
                                                    disabled={index === 0}
                                                    className="rounded-md border border-surface-300 p-2 text-surface-700 disabled:opacity-40"
                                                >
                                                    <ArrowUpIcon />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => movePriority(index, "down")}
                                                    disabled={index === savingsPriorities.length - 1}
                                                    className="rounded-md border border-surface-300 p-2 text-surface-700 disabled:opacity-40"
                                                >
                                                    <ArrowDownIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 8 && selected === "personal" && (
                            <div className="space-y-6 animate-fade-in">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Regla de distribución y Resumen</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Elige cómo dividir tu bolsa mensual. Te mostraremos cómo se financiarán tus metas con esta regla.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {(["50_30_20", "70_20_10", "80_20", "custom"] as DistributionRule[]).map((rule) => (
                                        <label key={rule} className="flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-4 py-3 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="distribution-rule"
                                                checked={distributionRule === rule}
                                                onChange={() => setDistributionRule(rule)}
                                            />
                                            <span className="text-sm text-[#0f2233] font-medium">{DISTRIBUTION_LABELS[rule]}</span>
                                        </label>
                                    ))}
                                </div>

                                {distributionRule === "custom" && (
                                    <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-surface-200 bg-surface-50 p-4">
                                        <div>
                                            <label className="label text-xs">Necesidades (%)</label>
                                            <input type="number" className="input-field bg-white" value={customNeedsPct} onChange={(event) => setCustomNeedsPct(event.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label text-xs">Deseos (%)</label>
                                            <input type="number" className="input-field bg-white" value={customWantsPct} onChange={(event) => setCustomWantsPct(event.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label text-xs">Ahorro (%)</label>
                                            <input type="number" className="input-field bg-white" value={customSavingsPct} onChange={(event) => setCustomSavingsPct(event.target.value)} />
                                        </div>
                                        <div>
                                            <label className="label text-xs">Deuda/Inversión (%)</label>
                                            <input type="number" className="input-field bg-white" value={customDebtPct} onChange={(event) => setCustomDebtPct(event.target.value)} />
                                        </div>
                                        <p className={`sm:col-span-2 text-sm ${Math.abs(distributionTotal - 100) <= 0.01 ? "text-positive-700" : "text-negative-700"}`}>
                                            Total actual: {distributionTotal.toFixed(2)}%
                                        </p>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-surface-200 bg-surface-50 p-5">
                                    <p className="text-xs uppercase tracking-[0.14em] text-surface-500">Bolsa consolidada</p>
                                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">{currency} {consolidatedIncome.toFixed(2)}</p>
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-lg bg-white px-3 py-2 border border-surface-200">
                                            <p className="text-surface-500">Necesidades</p>
                                            <p className="font-semibold text-[#0f2233]">{currency} {distributionAmounts.needs.toFixed(2)}</p>
                                        </div>
                                        <div className="rounded-lg bg-white px-3 py-2 border border-surface-200">
                                            <p className="text-surface-500">Deseos</p>
                                            <p className="font-semibold text-[#0f2233]">{currency} {distributionAmounts.wants.toFixed(2)}</p>
                                        </div>
                                        <div className="rounded-lg bg-white px-3 py-2 border border-surface-200">
                                            <p className="text-surface-500">Ahorro</p>
                                            <p className="font-semibold text-[#0f2233]">{currency} {distributionAmounts.savings.toFixed(2)}</p>
                                        </div>
                                        <div className="rounded-lg bg-white px-3 py-2 border border-surface-200">
                                            <p className="text-surface-500">Deuda / inversión</p>
                                            <p className="font-semibold text-[#0f2233]">{currency} {distributionAmounts.debt.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                {hasSavingsGoals && projectedGoalRows.length > 0 && (
                                    <div className="rounded-2xl border border-surface-200 bg-white p-5">
                                        <h3 className="text-sm font-semibold text-[#0f2233] mb-3">Proyección inicial</h3>
                                        <div className="space-y-3">
                                            {projectedGoalRows.map((goal) => (
                                                <div key={goal.id} className="rounded-lg border border-surface-200 bg-surface-50 p-3 text-sm">
                                                    <p className="font-semibold text-[#0f2233]">{goal.name || "Meta"}</p>
                                                    <p className="text-surface-600">Aporte mensual proyectado: {currency} {goal.projectedContribution.toFixed(2)}</p>
                                                    <p className="text-surface-600">
                                                        Llegada estimada: {goal.monthsToGoal ? `${goal.monthsToGoal} meses` : "Sin proyección"}
                                                    </p>
                                                    <p className="text-surface-600">% del ingreso destinado: {goal.percentOfIncome.toFixed(1)}%</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 8 && selected === "business" && (
                            <div className="space-y-6 animate-fade-in">
                                <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Configuración empresarial</h1>
                                <p className="text-base text-surface-600 leading-relaxed">
                                    Para perfil empresa no aplicamos regla de ahorro personal. Continuaremos con prioridad operativa y metas.
                                </p>
                            </div>
                        )}

                        <div className="mt-10 flex items-center justify-between border-t border-surface-200 pt-6">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={handleStepBack}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-800"
                                >
                                    <ArrowLeftIcon />
                                    Atrás
                                </button>
                            ) : (
                                <div />
                            )}

                            {step < TOTAL_STEPS ? (
                                <button
                                    type="button"
                                    onClick={handleStepNext}
                                    disabled={!selected}
                                    className="btn-primary min-w-[160px]"
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        Continuar
                                        <ArrowRightIcon size={14} />
                                    </span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleFinish}
                                    disabled={loading || !selected}
                                    className="btn-primary min-w-[240px] bg-[#117068] hover:bg-[#0d5952] border-none"
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        {loading ? <SpinnerIcon size={16} /> : <ArrowRightIcon size={14} />}
                                        Crear organización y continuar
                                    </span>
                                </button>
                            )}
                        </div>

                        {error && (
                            <div aria-live="polite" className="mt-4 rounded-xl border border-negative-200 bg-negative-50 px-4 py-3 text-sm text-negative-700 font-medium">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

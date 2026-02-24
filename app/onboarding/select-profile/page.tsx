"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProfileOrganization } from "@/app/actions/onboarding";
import { generateSmartDistribution } from "@/lib/server/ai-distribution";
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
type RulePillTone = "needs" | "wants" | "savings" | "debt";

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

const PRIORITY_LABELS: Record<SavingsPriority, string> = {
    fixed_expenses: "Cubrir gastos fijos",
    debt_payments: "Pagar deudas o tarjetas",
    savings_goals: "Aportar a metas de ahorro",
};

const PRIORITY_HELPER_TEXT: Record<SavingsPriority, string> = {
    fixed_expenses: "Asegura vivienda, salud, servicios y gastos inamovibles.",
    debt_payments: "Cubre mínimos de deuda y reduce intereses con prepagos.",
    savings_goals: "Destina el remanente a metas con una cascada mensual.",
};

const RULE_CARD_CONFIG: Record<
    Exclude<DistributionRule, "custom">,
    {
        title: string;
        description: string;
        pills: Array<{ label: string; value: number; tone: RulePillTone }>;
    }
> = {
    "50_30_20": {
        title: "50 / 30 / 20",
        description: "Necesidades · Deseos · Ahorro",
        pills: [
            { label: "Necesidades", value: 50, tone: "needs" },
            { label: "Deseos", value: 30, tone: "wants" },
            { label: "Ahorro", value: 20, tone: "savings" },
        ],
    },
    "70_20_10": {
        title: "70 / 20 / 10",
        description: "Gastos · Ahorro · Deuda o inversión",
        pills: [
            { label: "Gastos", value: 70, tone: "needs" },
            { label: "Ahorro", value: 20, tone: "savings" },
            { label: "Deuda", value: 10, tone: "debt" },
        ],
    },
    "80_20": {
        title: "80 / 20",
        description: "Simple: gastos y ahorro",
        pills: [
            { label: "Gastos", value: 80, tone: "needs" },
            { label: "Ahorro", value: 20, tone: "savings" },
        ],
    },
};

const FIXED_EXPENSE_KEYWORDS = [
    "alquiler",
    "rent",
    "hipoteca",
    "mortgage",
    "vivienda",
    "housing",
    "servicios",
    "utilities",
    "internet",
    "telefono",
    "phone",
    "seguro",
    "insurance",
    "colegio",
    "educacion",
    "education",
    "deuda",
    "debt",
    "debt payments",
    "loan",
    "prestamo",
    "suscripcion",
    "subscription",
    "salud",
    "health",
];

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

const InfoIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 10.2V16.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="7.2" r="1.1" fill="currentColor" />
    </svg>
);

function InfoPopover({
    title,
    children,
    align = "right",
}: {
    title: string;
    children: ReactNode;
    align?: "left" | "right";
}) {
    const alignClass = align === "left" ? "left-0" : "right-0";

    return (
        <div className="relative inline-flex group">
            <button
                type="button"
                aria-label={`Más información: ${title}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-surface-300 bg-white text-surface-600 transition-colors hover:text-[#0d4c7a] hover:border-[#0d4c7a]/50 focus:outline-none focus:ring-2 focus:ring-[#0d4c7a]/25"
            >
                <InfoIcon size={12} />
            </button>
            <div
                className={`pointer-events-none absolute ${alignClass} top-7 z-30 w-[320px] max-w-[min(92vw,320px)] rounded-xl border border-surface-200 bg-white p-3 shadow-xl opacity-0 translate-y-1 transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0`}
            >
                <p className="text-xs font-semibold text-[#0f2233]">{title}</p>
                <div className="mt-2 space-y-2 text-xs text-surface-600">{children}</div>
            </div>
        </div>
    );
}

function parseAmount(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(parsed, 0);
}

function parseDayOfMonth(value: string, fallback: number) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(31, Math.max(1, parsed));
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function normalizeCategoryLabel(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function isFixedExpenseCategory(value: string) {
    const normalized = normalizeCategoryLabel(value);
    return FIXED_EXPENSE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getRulePillClasses(tone: RulePillTone) {
    if (tone === "needs") return "bg-[#eaf3ff] text-[#1d4ed8]";
    if (tone === "wants") return "bg-[#fff4dc] text-[#a16207]";
    if (tone === "savings") return "bg-[#e8f8f0] text-[#117068]";
    return "bg-[#fcebea] text-[#b42318]";
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
    const [salaryFrequency, setSalaryFrequency] = useState<"monthly" | "biweekly">("monthly");
    const [salaryPaymentDay1, setSalaryPaymentDay1] = useState("30");
    const [salaryPaymentDay2, setSalaryPaymentDay2] = useState("15");
    const [firstFortnightAmount, setFirstFortnightAmount] = useState("");
    const [secondFortnightAmount, setSecondFortnightAmount] = useState("");

    const [hasAdditionalIncome, setHasAdditionalIncome] = useState(false);
    const [additionalIncome, setAdditionalIncome] = useState("");

    const [sharesFinances, setSharesFinances] = useState(false);
    const [partnerContribution, setPartnerContribution] = useState("");
    const [partnerSalaryFrequency, setPartnerSalaryFrequency] = useState<"monthly" | "biweekly">("monthly");
    const [partnerSalaryPaymentDay1, setPartnerSalaryPaymentDay1] = useState("30");
    const [partnerSalaryPaymentDay2, setPartnerSalaryPaymentDay2] = useState("15");
    const [partnerFirstFortnightAmount, setPartnerFirstFortnightAmount] = useState("");
    const [partnerSecondFortnightAmount, setPartnerSecondFortnightAmount] = useState("");

    const [accountName, setAccountName] = useState("Cuenta principal");
    const [accountType, setAccountType] = useState<"cash" | "bank" | "credit_card" | "loan" | "investment">("bank");
    const [openingBalance, setOpeningBalance] = useState("0");
    const [legalName, setLegalName] = useState("");

    const [hasCreditCards, setHasCreditCards] = useState(false);
    const [creditCards, setCreditCards] = useState<Array<{ id: string; name: string; creditLimit: string; currentBalance: string; paymentDay: string; paymentStrategy: "full" | "minimum" | "fixed"; minimumPaymentAmount: string; tea: string; hasDesgravamen: boolean; desgravamenAmount: string; }>>([]);

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

    const [aiReasoning, setAiReasoning] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");

    const [savingsPriorities, setSavingsPriorities] = useState<SavingsPriority[]>([
        "fixed_expenses",
        "debt_payments",
        "savings_goals",
    ]);

    const [hasSavingsGoals, setHasSavingsGoals] = useState(false);
    const [savingsGoals, setSavingsGoals] = useState<Array<{ id: string; name: string; targetAmount: string; deadlineDate: string; goalWeight: string }>>([]);

    const consolidatedIncome = useMemo(() => {
        const base = salaryFrequency === "monthly"
            ? parseAmount(monthlyIncomeNet)
            : parseAmount(firstFortnightAmount) + parseAmount(secondFortnightAmount);

        const extra = hasAdditionalIncome ? parseAmount(additionalIncome) : 0;

        const partner = sharesFinances
            ? (partnerSalaryFrequency === "monthly"
                ? parseAmount(partnerContribution)
                : parseAmount(partnerFirstFortnightAmount) + parseAmount(partnerSecondFortnightAmount))
            : 0;

        return round2(base + extra + partner);
    }, [monthlyIncomeNet, firstFortnightAmount, secondFortnightAmount, salaryFrequency, hasAdditionalIncome, additionalIncome, sharesFinances, partnerContribution, partnerFirstFortnightAmount, partnerSecondFortnightAmount, partnerSalaryFrequency]);

    const primaryIncomeMonthly = useMemo(
        () =>
            round2(
                salaryFrequency === "monthly"
                    ? parseAmount(monthlyIncomeNet)
                    : parseAmount(firstFortnightAmount) + parseAmount(secondFortnightAmount)
            ),
        [salaryFrequency, monthlyIncomeNet, firstFortnightAmount, secondFortnightAmount]
    );

    const partnerIncomeMonthly = useMemo(
        () =>
            round2(
                sharesFinances
                    ? (partnerSalaryFrequency === "monthly"
                        ? parseAmount(partnerContribution)
                        : parseAmount(partnerFirstFortnightAmount) + parseAmount(partnerSecondFortnightAmount))
                    : 0
            ),
        [
            sharesFinances,
            partnerSalaryFrequency,
            partnerContribution,
            partnerFirstFortnightAmount,
            partnerSecondFortnightAmount,
        ]
    );

    const additionalIncomeMonthly = useMemo(
        () => round2(hasAdditionalIncome ? parseAmount(additionalIncome) : 0),
        [hasAdditionalIncome, additionalIncome]
    );

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

    const revolvingCreditCards = useMemo(() => {
        return creditCards.filter(card => card.paymentStrategy !== "full");
    }, [creditCards]);

    const fullPaymentCreditCards = useMemo(() => {
        return creditCards.filter(card => card.paymentStrategy === "full");
    }, [creditCards]);

    const totalCreditCardDebt = useMemo(
        () =>
            round2(
                revolvingCreditCards.reduce(
                    (sum, card) => sum + Math.max(parseAmount(card.currentBalance), 0),
                    0
                )
            ),
        [revolvingCreditCards]
    );

    const totalCreditCardBalance = useMemo(
        () =>
            round2(
                creditCards.reduce(
                    (sum, card) => sum + Math.max(parseAmount(card.currentBalance), 0),
                    0
                )
            ),
        [creditCards]
    );

    const fullPaymentCardsCashOutflow = useMemo(
        () =>
            round2(
                fullPaymentCreditCards.reduce(
                    (sum, card) => sum + Math.max(parseAmount(card.currentBalance), 0),
                    0
                )
            ),
        [fullPaymentCreditCards]
    );

    const estimatedDebtPayment = useMemo(
        () => round2(
            revolvingCreditCards.reduce((sum, card) => {
                const statedMin = parseAmount(card.minimumPaymentAmount);
                if (statedMin > 0) return sum + statedMin;
                return sum + (Math.max(parseAmount(card.currentBalance), 0) * 0.05);
            }, 0)
        ),
        [revolvingCreditCards]
    );

    const budgetBreakdownRows = useMemo(
        () =>
            Object.entries(budgets)
                .map(([categoryName, rawAmount]) => {
                    const amount = parseAmount(rawAmount);
                    return {
                        categoryName,
                        amount,
                        isFixed: isFixedExpenseCategory(categoryName),
                    };
                })
                .filter((row) => row.amount > 0)
                .sort((a, b) => b.amount - a.amount),
        [budgets]
    );

    const variableExpensesBudget = useMemo(
        () =>
            round2(
                budgetBreakdownRows
                    .filter((row) => !row.isFixed)
                    .reduce((sum, row) => sum + row.amount, 0)
            ),
        [budgetBreakdownRows]
    );

    const fixedBudgetRows = useMemo(
        () => budgetBreakdownRows.filter((row) => row.isFixed),
        [budgetBreakdownRows]
    );

    const variableBudgetRows = useMemo(
        () => budgetBreakdownRows.filter((row) => !row.isFixed),
        [budgetBreakdownRows]
    );

    const fixedExpensesBudget = useMemo(
        () =>
            round2(
                budgetBreakdownRows.reduce((sum, row) => {
                    return row.isFixed
                        ? sum + row.amount
                        : sum;
                }, 0)
            ),
        [budgetBreakdownRows]
    );

    const creditCardBreakdownRows = useMemo(
        () =>
            creditCards.map((card) => {
                const currentBalance = Math.max(parseAmount(card.currentBalance), 0);
                const statedMinimum = parseAmount(card.minimumPaymentAmount);
                const estimatedMinimum =
                    card.paymentStrategy === "full"
                        ? 0
                        : statedMinimum > 0
                            ? statedMinimum
                            : round2(currentBalance * 0.05);
                const expectedCashOutflow =
                    card.paymentStrategy === "full" ? currentBalance : estimatedMinimum;

                return {
                    id: card.id,
                    name: card.name || "Tarjeta",
                    paymentStrategy: card.paymentStrategy,
                    currentBalance,
                    estimatedMinimum,
                    expectedCashOutflow,
                };
            }),
        [creditCards]
    );

    const priorityIndex = useMemo(
        () => ({
            fixed: savingsPriorities.indexOf("fixed_expenses"),
            debt: savingsPriorities.indexOf("debt_payments"),
            goals: savingsPriorities.indexOf("savings_goals"),
        }),
        [savingsPriorities]
    );

    const operationalCashRequired = useMemo(
        () => round2(fixedExpensesBudget + variableExpensesBudget + fullPaymentCardsCashOutflow),
        [fixedExpensesBudget, variableExpensesBudget, fullPaymentCardsCashOutflow]
    );

    const fixedNeedsShortfall = useMemo(
        () =>
            round2(Math.max(operationalCashRequired - distributionAmounts.needs, 0)),
        [operationalCashRequired, distributionAmounts.needs]
    );

    const fixedNeedsSurplus = useMemo(
        () =>
            round2(Math.max(distributionAmounts.needs - operationalCashRequired, 0)),
        [distributionAmounts.needs, operationalCashRequired]
    );

    const debtBucketShortfall = useMemo(
        () =>
            round2(Math.max(estimatedDebtPayment - distributionAmounts.debt, 0)),
        [estimatedDebtPayment, distributionAmounts.debt]
    );

    const debtBucketSurplus = useMemo(
        () =>
            round2(Math.max(distributionAmounts.debt - estimatedDebtPayment, 0)),
        [distributionAmounts.debt, estimatedDebtPayment]
    );

    const totalCardCashCommitment = useMemo(
        () => round2(estimatedDebtPayment + fullPaymentCardsCashOutflow),
        [estimatedDebtPayment, fullPaymentCardsCashOutflow]
    );

    const totalMandatoryOutflow = useMemo(
        () => round2(fixedExpensesBudget + variableExpensesBudget + totalCardCashCommitment),
        [fixedExpensesBudget, variableExpensesBudget, totalCardCashCommitment]
    );

    const availableAfterVariable = useMemo(
        () =>
            round2(
                Math.max(
                    consolidatedIncome -
                    fixedExpensesBudget -
                    variableExpensesBudget -
                    totalCardCashCommitment,
                    0
                )
            ),
        [
            consolidatedIncome,
            fixedExpensesBudget,
            variableExpensesBudget,
            totalCardCashCommitment,
        ]
    );

    const operationalBucketsAvailable = useMemo(
        () => round2(distributionAmounts.needs),
        [distributionAmounts.needs]
    );

    const operationalCashShortfall = useMemo(
        () => round2(Math.max(operationalCashRequired - operationalBucketsAvailable, 0)),
        [operationalCashRequired, operationalBucketsAvailable]
    );

    const operationalCashSurplus = useMemo(
        () => round2(Math.max(operationalBucketsAvailable - operationalCashRequired, 0)),
        [operationalBucketsAvailable, operationalCashRequired]
    );

    const dynamicSavingsPool = useMemo(() => {
        let available = distributionAmounts.savings;
        if (
            priorityIndex.fixed !== -1 &&
            priorityIndex.goals !== -1 &&
            priorityIndex.fixed < priorityIndex.goals
        ) {
            available -= operationalCashShortfall;
        }
        if (
            priorityIndex.debt !== -1 &&
            priorityIndex.goals !== -1 &&
            priorityIndex.debt < priorityIndex.goals
        ) {
            available -= debtBucketShortfall;
        }
        return round2(Math.max(available, 0));
    }, [
        distributionAmounts.savings,
        operationalCashShortfall,
        debtBucketShortfall,
        priorityIndex.fixed,
        priorityIndex.goals,
        priorityIndex.debt,
    ]);

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
                dynamicSavingsPool > 0 && totalWeight > 0
                    ? round2((dynamicSavingsPool * goal.goalWeightNum) / totalWeight)
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
    }, [savingsGoals, dynamicSavingsPool, consolidatedIncome]);

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

    async function applySmartDebtDistribution() {
        setIsAiLoading(true);
        setAiError("");
        setAiReasoning("");

        try {
            const response = await generateSmartDistribution({
                country,
                currency,
                consolidatedIncome,
                fixedExpensesBudget,
                variableExpensesBudget,
                estimatedDebtPayment,
                fullPaymentCardsCashOutflow,
                creditCards: creditCards.map((c) => ({
                    name: c.name || "Tarjeta",
                    currentBalance: parseAmount(c.currentBalance),
                    minimumPaymentAmount:
                        c.paymentStrategy === "full"
                            ? 0
                            : parseAmount(c.minimumPaymentAmount),
                    paymentStrategy: c.paymentStrategy,
                    tea: parseAmount(c.tea),
                })),
                savingsGoals: savingsGoals.map((g) => ({
                    name: g.name || "Meta",
                    targetAmount: parseAmount(g.targetAmount),
                })),
            });

            if (response.success && response.data) {
                setDistributionRule("custom");
                setCustomNeedsPct(response.data.needs.toString());
                setCustomWantsPct(response.data.wants.toString());
                setCustomSavingsPct(response.data.savings.toString());
                setCustomDebtPct(response.data.debt.toString());
                setAiReasoning(response.data.reasoning);
            } else {
                setAiError(response.error || "Error al calcular la distribución");
                // Fallback matématico
                const safeIncome = Math.max(consolidatedIncome, 1);
                const debtRatio = totalCreditCardDebt / safeIncome;
                const operationalRatio = (fixedExpensesBudget + variableExpensesBudget + fullPaymentCardsCashOutflow) / safeIncome;
                setDistributionRule("custom");
                const debtPctBase = debtRatio >= 1.5 ? 20 : debtRatio >= 0.75 ? 15 : debtRatio > 0 ? 10 : 0;
                const availablePct = Math.max(100 - debtPctBase, 0);
                const operationalPctBase = Math.min(Math.max(Math.ceil(operationalRatio * 100), 0), availablePct);
                const needsPct = operationalPctBase;
                const wantsPct = Math.max(availablePct - needsPct, 0);
                const savingsPct = Math.max(100 - needsPct - wantsPct - debtPctBase, 0);

                setCustomNeedsPct(needsPct.toString());
                setCustomWantsPct(wantsPct.toString());
                setCustomSavingsPct(savingsPct.toString());
                setCustomDebtPct(debtPctBase.toString());
            }
        } catch {
            setAiError("Ocurrió un error inesperado al llamar a la IA.");
        } finally {
            setIsAiLoading(false);
        }
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
            if (selected === "personal") {
                if (salaryFrequency === "monthly" && parseAmount(monthlyIncomeNet) <= 0) {
                    setError("Ingresa tu ingreso mensual neto para continuar.");
                    return;
                }
                if (salaryFrequency === "biweekly" && (parseAmount(firstFortnightAmount) <= 0 && parseAmount(secondFortnightAmount) <= 0)) {
                    setError("Ingresa el monto de al menos una quincena para continuar.");
                    return;
                }
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
            const baseIncome =
                salaryFrequency === "monthly"
                    ? parseAmount(monthlyIncomeNet)
                    : round2(parseAmount(firstFortnightAmount) + parseAmount(secondFortnightAmount));
            const additionalIncomeAmount = hasAdditionalIncome ? parseAmount(additionalIncome) : 0;
            const partnerIncome = sharesFinances
                ? (
                    partnerSalaryFrequency === "monthly"
                        ? parseAmount(partnerContribution)
                        : round2(parseAmount(partnerFirstFortnightAmount) + parseAmount(partnerSecondFortnightAmount))
                )
                : 0;

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
                        paymentDay: parseInt(card.paymentDay) || 30,
                        paymentStrategy: card.paymentStrategy,
                        minimumPaymentAmount: parseAmount(card.minimumPaymentAmount) || undefined,
                        tea: card.paymentStrategy !== "full" && card.tea ? parseAmount(card.tea) : undefined,
                        hasDesgravamen: card.paymentStrategy !== "full" ? card.hasDesgravamen : false,
                        desgravamenAmount: card.paymentStrategy !== "full" && card.hasDesgravamen ? parseAmount(card.desgravamenAmount) : undefined,
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
                monthlyIncomeNet: baseIncome,
                salaryFrequency,
                salaryPaymentDay1: parseDayOfMonth(salaryPaymentDay1, 30),
                salaryPaymentDay2: parseDayOfMonth(salaryPaymentDay2, 15),
                firstFortnightAmount: parseAmount(firstFortnightAmount),
                secondFortnightAmount: parseAmount(secondFortnightAmount),
                partnerSalaryFrequency,
                partnerSalaryPaymentDay1: parseDayOfMonth(partnerSalaryPaymentDay1, 30),
                partnerSalaryPaymentDay2: parseDayOfMonth(partnerSalaryPaymentDay2, 15),
                partnerFirstFortnightAmount: parseAmount(partnerFirstFortnightAmount),
                partnerSecondFortnightAmount: parseAmount(partnerSecondFortnightAmount),
                additionalIncome: additionalIncomeAmount,
                partnerContribution: partnerIncome,
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

    const isPersonalDistributionCanvas = step === 8 && selected === "personal";

    return (
        <div
            className={`min-h-screen bg-[linear-gradient(165deg,#f7fbff_0%,#edf5fb_50%,#f9fcfd_100%)] px-4 py-8 sm:py-12 flex justify-center ${
                isPersonalDistributionCanvas ? "items-start sm:px-10 lg:px-12" : "items-center sm:px-8"
            }`}
        >
            <div className={`w-full animate-fade-in relative ${isPersonalDistributionCanvas ? "max-w-[1360px]" : "max-w-3xl"}`}>
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

                <div
                    className={`rounded-3xl border border-surface-200 bg-white shadow-card relative overflow-hidden ${
                        isPersonalDistributionCanvas ? "p-5 sm:p-7 lg:p-8" : "p-6 sm:p-10"
                    }`}
                >
                    <div className="absolute -top-8 -right-4 text-[120px] font-black text-surface-50 opacity-40 select-none pointer-events-none">
                        {step}
                    </div>

                    <div className={`relative z-10 w-full transition-all duration-300 ${isPersonalDistributionCanvas ? "space-y-1" : ""}`}>
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
                                            <label className="label text-[#0d4c7a]">Frecuencia de tus ingresos principales</label>
                                            <select
                                                className="input-field bg-white border-[#b8d8f0]"
                                                value={salaryFrequency}
                                                onChange={(event) => setSalaryFrequency(event.target.value as "monthly" | "biweekly")}
                                            >
                                                <option value="monthly">Mensual (1 vez al mes)</option>
                                                <option value="biweekly">Quincenal (2 veces al mes)</option>
                                            </select>
                                        </div>

                                        {salaryFrequency === "monthly" ? (
                                            <div className="grid gap-4 sm:grid-cols-2">
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
                                                <div>
                                                    <label className="label text-[#0d4c7a]">Día de pago</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="31"
                                                        className="input-field bg-white border-[#b8d8f0]"
                                                        value={salaryPaymentDay1}
                                                        onChange={(event) => setSalaryPaymentDay1(event.target.value)}
                                                        placeholder="30"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-3">
                                                    <label className="label text-[#0d4c7a] font-medium text-sm">Primera Quincena</label>
                                                    <div>
                                                        <label className="label text-xs text-[#0d4c7a]/80">Día de pago</label>
                                                        <input type="number" min="1" max="31" className="input-field bg-white border-[#b8d8f0]" value={salaryPaymentDay2} onChange={(event) => setSalaryPaymentDay2(event.target.value)} placeholder="15" />
                                                    </div>
                                                    <div>
                                                        <label className="label text-xs text-[#0d4c7a]/80">Monto depositado</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-2.5 text-[#0d4c7a]/70 text-sm">{currency}</span>
                                                            <input type="number" min="0" step="0.01" className="input-field bg-white pl-12 border-[#b8d8f0]" value={firstFortnightAmount} onChange={(event) => setFirstFortnightAmount(event.target.value)} placeholder="0" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="label text-[#0d4c7a] font-medium text-sm">Segunda Quincena</label>
                                                    <div>
                                                        <label className="label text-xs text-[#0d4c7a]/80">Día de pago</label>
                                                        <input type="number" min="1" max="31" className="input-field bg-white border-[#b8d8f0]" value={salaryPaymentDay1} onChange={(event) => setSalaryPaymentDay1(event.target.value)} placeholder="30" />
                                                    </div>
                                                    <div>
                                                        <label className="label text-xs text-[#0d4c7a]/80">Monto depositado</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-2.5 text-[#0d4c7a]/70 text-sm">{currency}</span>
                                                            <input type="number" min="0" step="0.01" className="input-field bg-white pl-12 border-[#b8d8f0]" value={secondFortnightAmount} onChange={(event) => setSecondFortnightAmount(event.target.value)} placeholder="0" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

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
                                            <div className="space-y-4 pt-4 border-t border-[#b8d8f0]">
                                                <div>
                                                    <label className="label text-[#0d4c7a]">Frecuencia del aporte</label>
                                                    <select
                                                        className="input-field bg-white border-[#b8d8f0]"
                                                        value={partnerSalaryFrequency}
                                                        onChange={(event) => setPartnerSalaryFrequency(event.target.value as "monthly" | "biweekly")}
                                                    >
                                                        <option value="monthly">Mensual</option>
                                                        <option value="biweekly">Quincenal</option>
                                                    </select>
                                                </div>

                                                {partnerSalaryFrequency === "monthly" ? (
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <div>
                                                            <label className="label text-[#0d4c7a]">Aporte mensual total</label>
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
                                                        <div>
                                                            <label className="label text-[#0d4c7a]">Día de aporte</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="31"
                                                                className="input-field bg-white border-[#b8d8f0]"
                                                                value={partnerSalaryPaymentDay1}
                                                                onChange={(event) => setPartnerSalaryPaymentDay1(event.target.value)}
                                                                placeholder="30"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <div className="space-y-3">
                                                            <label className="label text-[#0d4c7a] font-medium text-sm">Aporte 1ra Quincena</label>
                                                            <div>
                                                                <label className="label text-xs text-[#0d4c7a]/80">Día</label>
                                                                <input type="number" min="1" max="31" className="input-field bg-white border-[#b8d8f0]" value={partnerSalaryPaymentDay2} onChange={(event) => setPartnerSalaryPaymentDay2(event.target.value)} placeholder="15" />
                                                            </div>
                                                            <div>
                                                                <label className="label text-xs text-[#0d4c7a]/80">Monto</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-2.5 text-[#0d4c7a]/70 text-sm">{currency}</span>
                                                                    <input type="number" min="0" step="0.01" className="input-field bg-white pl-12 border-[#b8d8f0]" value={partnerFirstFortnightAmount} onChange={(event) => setPartnerFirstFortnightAmount(event.target.value)} placeholder="0" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="label text-[#0d4c7a] font-medium text-sm">Aporte 2da Quincena</label>
                                                            <div>
                                                                <label className="label text-xs text-[#0d4c7a]/80">Día</label>
                                                                <input type="number" min="1" max="31" className="input-field bg-white border-[#b8d8f0]" value={partnerSalaryPaymentDay1} onChange={(event) => setPartnerSalaryPaymentDay1(event.target.value)} placeholder="30" />
                                                            </div>
                                                            <div>
                                                                <label className="label text-xs text-[#0d4c7a]/80">Monto</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-2.5 text-[#0d4c7a]/70 text-sm">{currency}</span>
                                                                    <input type="number" min="0" step="0.01" className="input-field bg-white pl-12 border-[#b8d8f0]" value={partnerSecondFortnightAmount} onChange={(event) => setPartnerSecondFortnightAmount(event.target.value)} placeholder="0" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                                                                paymentDay: "30",
                                                                paymentStrategy: "full",
                                                                minimumPaymentAmount: "",
                                                                tea: "",
                                                                hasDesgravamen: false,
                                                                desgravamenAmount: "",
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
                                                                aria-label={`Eliminar tarjeta ${index + 1}`}
                                                                className="text-surface-400 hover:text-negative-600"
                                                            >
                                                                <TrashIcon />
                                                            </button>
                                                        </div>

                                                        <div className="grid gap-3 sm:grid-cols-2 mt-3">
                                                            <div className="sm:col-span-2">
                                                                <label className="label text-xs">Nombre de la tarjeta</label>
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
                                                            <div>
                                                                <label className="label text-xs">Estrategia de pago habitual</label>
                                                                <select
                                                                    className="input-field bg-surface-50"
                                                                    value={card.paymentStrategy}
                                                                    onChange={(event) => {
                                                                        setCreditCards((previous) => {
                                                                            const next = [...previous];
                                                                            next[index].paymentStrategy = event.target.value as "full" | "minimum" | "fixed";
                                                                            return next;
                                                                        });
                                                                    }}
                                                                >
                                                                    <option value="full">Pago total (No genera intereses)</option>
                                                                    <option value="minimum">Pago mínimo (Mantiene deuda)</option>
                                                                    <option value="fixed">Pago fijo (Abono mayor al mínimo)</option>
                                                                </select>
                                                                {card.paymentStrategy === "full" && (
                                                                    <p className="mt-1.5 text-[10px] text-surface-500 leading-tight">
                                                                        Al elegir pago total, CashFlow asume que usas la tarjeta como medio transaccional. Este saldo no se considerará &quot;deuda estructural&quot; en la cascada mensual.
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="label text-xs">Día de pago</label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="31"
                                                                    className="input-field bg-surface-50"
                                                                    value={card.paymentDay}
                                                                    onChange={(event) => {
                                                                        setCreditCards((previous) => {
                                                                            const next = [...previous];
                                                                            next[index].paymentDay = event.target.value;
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    placeholder="30"
                                                                />
                                                            </div>
                                                            {card.paymentStrategy !== "full" && (
                                                                <>
                                                                    <div className="sm:col-span-2">
                                                                        <label className="label text-xs">Monto de pago (Mínimo o Fijo mensual)</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-2.5 text-surface-500 text-sm">{currency}</span>
                                                                            <input
                                                                                type="number"
                                                                                className="input-field bg-surface-50 pl-12"
                                                                                value={card.minimumPaymentAmount}
                                                                                onChange={(event) => {
                                                                                    setCreditCards((previous) => {
                                                                                        const next = [...previous];
                                                                                        next[index].minimumPaymentAmount = event.target.value;
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                placeholder="Dejar vacío para usar 5% del saldo"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="label text-xs">TEA (%)</label>
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                step="0.01"
                                                                                className="input-field bg-surface-50 pr-8"
                                                                                value={card.tea}
                                                                                onChange={(event) => {
                                                                                    setCreditCards((previous) => {
                                                                                        const next = [...previous];
                                                                                        next[index].tea = event.target.value;
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                                placeholder="55.00"
                                                                            />
                                                                            <span className="absolute right-3 top-2.5 text-surface-500 text-sm">%</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col justify-center">
                                                                        <label className="flex items-center gap-2 cursor-pointer mt-6">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="h-4 w-4"
                                                                                checked={card.hasDesgravamen}
                                                                                onChange={(event) => {
                                                                                    setCreditCards((previous) => {
                                                                                        const next = [...previous];
                                                                                        next[index].hasDesgravamen = event.target.checked;
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                            />
                                                                            <span className="text-xs text-[#0f2233]">¿Cobra seguro desgravamen mensual?</span>
                                                                        </label>
                                                                    </div>
                                                                    {card.hasDesgravamen && (
                                                                        <div className="sm:col-span-2">
                                                                            <label className="label text-xs">Monto de desgravamen o comisiones</label>
                                                                            <div className="relative">
                                                                                <span className="absolute left-3 top-2.5 text-surface-500 text-sm">{currency}</span>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                    className="input-field bg-surface-50 pl-12"
                                                                                    value={card.desgravamenAmount}
                                                                                    onChange={(event) => {
                                                                                        setCreditCards((previous) => {
                                                                                            const next = [...previous];
                                                                                            next[index].desgravamenAmount = event.target.value;
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    placeholder="0"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
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
                                                                paymentDay: "30",
                                                                paymentStrategy: "full",
                                                                minimumPaymentAmount: "",
                                                                tea: "",
                                                                hasDesgravamen: false,
                                                                desgravamenAmount: "",
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
                                                        aria-label={`Eliminar categoría ${category.name}`}
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
                                                            aria-label={`Eliminar meta ${index + 1}`}
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
                                                    aria-label={`Subir prioridad: ${PRIORITY_LABELS[priority]}`}
                                                    className="rounded-md border border-surface-300 p-2 text-surface-700 disabled:opacity-40"
                                                >
                                                    <ArrowUpIcon />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => movePriority(index, "down")}
                                                    disabled={index === savingsPriorities.length - 1}
                                                    aria-label={`Bajar prioridad: ${PRIORITY_LABELS[priority]}`}
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
                                {/* Header */}
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-semibold text-[#0f2233]">Distribución Inteligente</h1>
                                    <p className="mt-3 text-base text-surface-600 leading-relaxed">
                                        Analizamos tu ingreso, presupuesto por categoría y tus tarjetas para recomendar una estructura realista.
                                    </p>
                                </div>

                                {/* ═══ 3-COLUMN GRID ═══ */}
                                <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">

                                    {/* ── COLUMN 1: Ingresos & Flujo ── */}
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-surface-200 bg-white px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Ingresos &amp; Flujo</p>
                                        </div>

                                        {/* Bolsa consolidada */}
                                        <div className="rounded-2xl border border-[#0d4c7a]/20 bg-[linear-gradient(135deg,#0d2b43_0%,#143c5c_58%,#1a5579_100%)] p-6 text-white shadow-md">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">Bolsa mensual consolidada</p>
                                            <p className="mt-2 text-3xl font-semibold tracking-tight">{currency} {consolidatedIncome.toFixed(2)}</p>
                                            <div className="mt-4 space-y-2">
                                                <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                                                    <span className="text-[11px] text-white/65">Ingreso principal</span>
                                                    <span className="text-sm font-semibold">{currency} {primaryIncomeMonthly.toFixed(2)}</span>
                                                </div>
                                                {(sharesFinances && partnerIncomeMonthly > 0) && (
                                                    <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                                                        <span className="text-[11px] text-white/65">Aporte de pareja</span>
                                                        <span className="text-sm font-semibold text-[#b8f2d7]">+{currency} {partnerIncomeMonthly.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {(hasAdditionalIncome && additionalIncomeMonthly > 0) && (
                                                    <div className="flex items-center justify-between rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                                                        <span className="text-[11px] text-white/65">Ingreso adicional</span>
                                                        <span className="text-sm font-semibold text-[#d0e7ff]">+{currency} {additionalIncomeMonthly.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Flujo de dinero */}
                                        <div className="rounded-2xl border border-surface-200 bg-[#f8fafc] p-5 shadow-sm">
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">El flujo de tu dinero</h3>
                                                <InfoPopover title="Detalle del flujo mensual" align="left">
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span>Ingreso consolidado</span>
                                                            <span className="font-semibold text-[#0f2233]">{currency} {consolidatedIncome.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span>Gastos fijos</span>
                                                            <span className="font-semibold text-negative-600">-{currency} {fixedExpensesBudget.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span>Gastos variables</span>
                                                            <span className="font-semibold text-negative-600">-{currency} {variableExpensesBudget.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span>Pago mínimo revolvente</span>
                                                            <span className="font-semibold text-negative-600">-{currency} {estimatedDebtPayment.toFixed(2)}</span>
                                                        </div>
                                                        {fullPaymentCardsCashOutflow > 0 && (
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>Pago total tarjetas (caja)</span>
                                                                <span className="font-semibold text-negative-600">-{currency} {fullPaymentCardsCashOutflow.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </InfoPopover>
                                            </div>
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-surface-600">Ingreso mensual</span>
                                                    <span className="font-semibold text-[#0f2233]">{currency} {consolidatedIncome.toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-surface-600">Compromisos totales</span>
                                                    <span className="font-semibold text-negative-600">-{currency} {totalMandatoryOutflow.toFixed(2)}</span>
                                                </div>
                                                <div className="border-t border-surface-200 pt-2.5 flex items-center justify-between text-sm">
                                                    <span className="font-semibold text-[#117068]">Saldo libre real</span>
                                                    <span className="font-semibold text-[#117068]">{currency} {availableAfterVariable.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detalle presupuesto + tarjetas */}
                                        {(budgetBreakdownRows.length > 0 || creditCardBreakdownRows.length > 0) && (
                                            <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">Presupuesto declarado</p>
                                                    <InfoPopover title="Detalle de presupuesto y tarjetas" align="left">
                                                        <div className="space-y-2">
                                                            {fixedBudgetRows.length > 0 && (
                                                                <div>
                                                                    <p className="mb-1 font-semibold text-[#0d4c7a]">Gastos fijos</p>
                                                                    {fixedBudgetRows.map((row) => (
                                                                        <div key={`fixed-popover-${row.categoryName}`} className="flex items-center justify-between gap-3">
                                                                            <span>{row.categoryName}</span>
                                                                            <span className="font-semibold text-[#0f2233]">{currency} {row.amount.toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {variableBudgetRows.length > 0 && (
                                                                <div>
                                                                    <p className="mb-1 font-semibold text-[#8a5a08]">Gastos variables</p>
                                                                    {variableBudgetRows.map((row) => (
                                                                        <div key={`var-popover-${row.categoryName}`} className="flex items-center justify-between gap-3">
                                                                            <span>{row.categoryName}</span>
                                                                            <span className="font-semibold text-[#0f2233]">{currency} {row.amount.toFixed(2)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {creditCardBreakdownRows.length > 0 && (
                                                                <div>
                                                                    <p className="mb-1 font-semibold text-[#0f2233]">Tarjetas registradas</p>
                                                                    {creditCardBreakdownRows.map((card) => (
                                                                        <div key={`cc-popover-${card.id}`} className="rounded-md border border-surface-200 bg-surface-50 px-2 py-1.5 mb-1">
                                                                            <p className="font-semibold text-[#0f2233]">{card.name}</p>
                                                                            <p>Saldo: {currency} {card.currentBalance.toFixed(2)}</p>
                                                                            <p>Estrategia: {card.paymentStrategy === "full" ? "Pago total" : card.paymentStrategy === "minimum" ? "Pago mínimo" : "Pago fijo"}</p>
                                                                            <p>{card.paymentStrategy === "full" ? "Pago esperado" : "Mínimo estimado"}: {currency} {card.expectedCashOutflow.toFixed(2)}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </InfoPopover>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <article className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                                                        <p className="text-[10px] text-surface-500">Gastos fijos</p>
                                                        <p className="mt-0.5 text-sm font-semibold text-[#0f2233]">{currency} {fixedExpensesBudget.toFixed(2)}</p>
                                                    </article>
                                                    <article className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                                                        <p className="text-[10px] text-surface-500">Gastos variables</p>
                                                        <p className="mt-0.5 text-sm font-semibold text-[#0f2233]">{currency} {variableExpensesBudget.toFixed(2)}</p>
                                                    </article>
                                                    <article className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                                                        <p className="text-[10px] text-surface-500">Tarjetas (saldo)</p>
                                                        <p className="mt-0.5 text-sm font-semibold text-[#0f2233]">{currency} {totalCreditCardBalance.toFixed(2)}</p>
                                                    </article>
                                                    <article className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                                                        <p className="text-[10px] text-surface-500">Total presupuesto</p>
                                                        <p className="mt-0.5 text-sm font-semibold text-[#0f2233]">{currency} {(fixedExpensesBudget + variableExpensesBudget).toFixed(2)}</p>
                                                    </article>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── COLUMN 2: Análisis & Distribución ── */}
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-surface-200 bg-white px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Análisis &amp; Distribución</p>
                                        </div>

                                        {/* Selección de Regla */}
                                        <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                                            <div className="flex items-center justify-between gap-3 mb-4">
                                                <div>
                                                    <h3 className="text-sm font-semibold text-[#0f2233]">Selecciona tu modelo de distribución</h3>
                                                    <p className="mt-1 text-xs text-surface-500">
                                                        Ajusta cómo repartir la bolsa mensual entre operación, ahorro y deuda.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={applySmartDebtDistribution}
                                                    disabled={isAiLoading}
                                                    className="rounded-lg border border-[#bfdbec] bg-[#f2f8fc] px-3 py-2 text-xs font-semibold text-[#0d4c7a] hover:bg-[#e8f3fb] disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isAiLoading ? "Analizando con IA..." : "Auto-completar con IA"}
                                                </button>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                                {(Object.keys(RULE_CARD_CONFIG) as Array<Exclude<DistributionRule, "custom">>).map((rule) => {
                                                    const card = RULE_CARD_CONFIG[rule];
                                                    const selectedRule = distributionRule === rule;

                                                    return (
                                                        <label
                                                            key={rule}
                                                            className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedRule
                                                                ? "border-[#0d4c7a] bg-[#f2f8fc] shadow-sm"
                                                                : "border-surface-200 bg-white hover:border-[#c7d7e6]"
                                                                }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="distribution-rule"
                                                                className="sr-only"
                                                                checked={selectedRule}
                                                                onChange={() => {
                                                                    setDistributionRule(rule);
                                                                    setAiReasoning("");
                                                                }}
                                                            />
                                                            <p className={`text-sm font-semibold ${selectedRule ? "text-[#0d4c7a]" : "text-[#0f2233]"}`}>
                                                                {card.title}
                                                            </p>
                                                            <p className="mt-1 text-[11px] text-surface-500">
                                                                {card.description}
                                                            </p>
                                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                                {card.pills.map((pill) => (
                                                                    <span
                                                                        key={`${rule}-${pill.label}`}
                                                                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${getRulePillClasses(pill.tone)}`}
                                                                    >
                                                                        {pill.value}% {pill.label}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>

                                            <label
                                                className={`mt-3 flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 cursor-pointer transition-all ${distributionRule === "custom"
                                                    ? "border-[#0d4c7a] bg-[#f2f8fc]"
                                                    : "border-surface-300 bg-surface-50 hover:border-[#0d4c7a]/40"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="distribution-rule"
                                                    className="sr-only"
                                                    checked={distributionRule === "custom"}
                                                    onChange={() => {
                                                        setDistributionRule("custom");
                                                        setAiReasoning("");
                                                    }}
                                                />
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-[#0d4c7a] border border-surface-200">
                                                    %
                                                </span>
                                                <span>
                                                    <span className="block text-sm font-semibold text-[#0f2233]">A medida</span>
                                                    <span className="block text-[11px] text-surface-500">
                                                        Defino mis propios porcentajes de distribución.
                                                    </span>
                                                </span>
                                            </label>

                                            {aiError && (
                                                <p className="mt-3 text-xs text-negative-600 bg-negative-50 p-2 rounded-lg">{aiError}</p>
                                            )}
                                        </div>

                                        {/* Inputs Custom */}
                                        {distributionRule === "custom" && (
                                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 rounded-xl border border-surface-200 bg-white p-4">
                                                <div>
                                                    <label className="label text-xs">Necesidades (%)</label>
                                                    <input type="number" className="input-field bg-surface-50" value={customNeedsPct} onChange={(event) => setCustomNeedsPct(event.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="label text-xs">Deseos (%)</label>
                                                    <input type="number" className="input-field bg-surface-50" value={customWantsPct} onChange={(event) => setCustomWantsPct(event.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="label text-xs">Ahorro (%)</label>
                                                    <input type="number" className="input-field bg-surface-50" value={customSavingsPct} onChange={(event) => setCustomSavingsPct(event.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="label text-xs">Deuda (%)</label>
                                                    <input type="number" className="input-field bg-surface-50" value={customDebtPct} onChange={(event) => setCustomDebtPct(event.target.value)} />
                                                </div>
                                                <p className={`sm:col-span-4 text-xs font-medium text-right ${Math.abs(distributionTotal - 100) <= 0.01 ? "text-positive-600" : "text-negative-600"}`}>
                                                    El total suma: {distributionTotal.toFixed(2)}%
                                                </p>
                                            </div>
                                        )}

                                        {aiReasoning && !isAiLoading && (
                                            <div className="rounded-2xl border border-[#10283b] bg-[linear-gradient(140deg,#10283b_0%,#153a56_60%,#1d4f70_100%)] p-4 text-white shadow-md">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9fd4f3]">Recomendación de IA</p>
                                                <p className="mt-2 text-xs leading-relaxed text-white/85">{aiReasoning}</p>
                                            </div>
                                        )}

                                        <div className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-surface-500">Distribución final</h3>
                                                <p className="text-[10px] text-surface-500">{currency} {consolidatedIncome.toFixed(2)} / mes</p>
                                            </div>

                                            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-100">
                                                <span className="bg-[#3b82f6]" style={{ width: `${Math.max(distribution.needsPct, 0)}%` }} />
                                                <span className="bg-[#f59e0b]" style={{ width: `${Math.max(distribution.wantsPct, 0)}%` }} />
                                                <span className="bg-[#10b981]" style={{ width: `${Math.max(distribution.savingsPct, 0)}%` }} />
                                                <span className="bg-[#ef4444]" style={{ width: `${Math.max(distribution.debtPct, 0)}%` }} />
                                            </div>
                                            <div className="mt-3 space-y-1.5">
                                                {[
                                                    { label: "Necesidades", pct: distribution.needsPct, amount: distributionAmounts.needs, color: "bg-[#3b82f6]" },
                                                    { label: "Deseos", pct: distribution.wantsPct, amount: distributionAmounts.wants, color: "bg-[#f59e0b]" },
                                                    { label: "Ahorro", pct: distribution.savingsPct, amount: distributionAmounts.savings, color: "bg-[#10b981]" },
                                                    { label: "Deuda", pct: distribution.debtPct, amount: distributionAmounts.debt, color: "bg-[#ef4444]" },
                                                ].map((item) => (
                                                    <div key={item.label} className="flex items-center gap-1.5 text-[11px]">
                                                        <span className={`inline-block h-2 w-2 rounded-full ${item.color}`} />
                                                        <span className="text-surface-600">{item.label} {item.pct.toFixed(1)}%</span>
                                                        <span className="ml-auto font-semibold text-[#0f2233]">{currency} {item.amount.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${operationalCashShortfall > 0 ? "border-[#f4c2c7] bg-[#fdf1f2] text-[#b42318]" : "border-[#bfe1d8] bg-[#eef9f5] text-[#117068]"
                                                }`}>
                                                {operationalCashShortfall > 0
                                                    ? `Ajusta necesidades o reduce compromisos por ${currency} ${operationalCashShortfall.toFixed(2)}.`
                                                    : `Compromisos cubiertos. Saldo libre: ${currency} ${availableAfterVariable.toFixed(2)}.`}
                                            </div>
                                        </div>
                                    </div>{/* END COLUMN 2 */}

                                    {/* ── COLUMN 3: Control & Decisiones ── */}
                                    <div className="space-y-4 lg:col-span-2 2xl:col-span-1">
                                        <div className="rounded-xl border border-surface-200 bg-white px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">Control &amp; Decisiones</p>
                                        </div>

                                        {/* Prioridad operativa */}
                                        <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                                            <h3 className="text-xs font-semibold text-[#0f2233]">Prioridad operativa</h3>
                                            <p className="mt-1 text-[11px] text-surface-500">Orden cuando el flujo es limitado.</p>
                                            <div className="mt-3 space-y-1.5">
                                                {savingsPriorities.map((priority, index) => (
                                                    <div key={`priority-summary-${priority}`} className="flex items-start gap-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                                                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0d4c7a] text-[10px] font-semibold text-white">{index + 1}</span>
                                                        <div>
                                                            <p className="text-xs font-semibold text-[#0f2233]">{PRIORITY_LABELS[priority]}</p>
                                                            <p className="text-[10px] text-surface-500">{PRIORITY_HELPER_TEXT[priority]}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Análisis de buckets */}
                                        <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
                                            <h3 className="text-xs font-semibold text-[#0f2233] mb-3">Análisis de distribución</h3>
                                            <div className={`rounded-lg border px-3 py-2 text-[11px] mb-3 ${operationalCashShortfall > 0 ? "border-[#f5c2c7] bg-[#fdf2f3] text-negative-700" : "border-[#bfe1d8] bg-[#eef9f5] text-[#117068]"
                                                }`}>
                                                {operationalCashShortfall > 0
                                                    ? `Necesidades: ${currency} ${operationalBucketsAvailable.toFixed(2)} vs operativo ${currency} ${operationalCashRequired.toFixed(2)}. Faltan ${currency} ${operationalCashShortfall.toFixed(2)}.`
                                                    : `Operativo cubierto. Margen: ${currency} ${operationalCashSurplus.toFixed(2)}.`}
                                            </div>
                                            <div className="space-y-2">
                                                {/* Necesidades */}
                                                <div className={`rounded-lg border p-3 ${fixedNeedsShortfall > 0 ? "border-[#f5c2c7] bg-[#fdf2f3]" : "border-surface-200 bg-surface-50"}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${fixedNeedsShortfall > 0 ? "bg-negative-500" : "bg-positive-500"}`} />
                                                            <span className="text-xs font-semibold text-[#0f2233]">Necesidades ({distribution.needsPct}%)</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-[#0f2233]">{currency} {distributionAmounts.needs.toFixed(2)}</span>
                                                    </div>
                                                    <p className="mt-1.5 text-[10px] text-surface-600">Cubre operativo por <b>{currency} {operationalCashRequired.toFixed(2)}</b>.</p>
                                                    {fixedNeedsShortfall > 0
                                                        ? <p className="mt-1 text-[10px] font-medium text-negative-700">Faltan {currency} {fixedNeedsShortfall.toFixed(2)}.</p>
                                                        : <p className="mt-1 text-[10px] font-medium text-positive-700">Cubierto. Sobran {currency} {fixedNeedsSurplus.toFixed(2)}.</p>
                                                    }
                                                </div>
                                                {/* Deuda */}
                                                <div className={`rounded-lg border p-3 ${debtBucketShortfall > 0 || (totalCreditCardDebt > 0 && distribution.debtPct === 0) ? "border-[#f5c2c7] bg-[#fdf2f3]" : "border-surface-200 bg-surface-50"}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${debtBucketShortfall > 0 ? "bg-negative-500" : "bg-positive-500"}`} />
                                                            <span className="text-xs font-semibold text-[#0f2233]">Deuda ({distribution.debtPct}%)</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-[#0f2233]">{currency} {distributionAmounts.debt.toFixed(2)}</span>
                                                    </div>
                                                    <p className="mt-1.5 text-[10px] text-surface-600">
                                                        {totalCreditCardDebt > 0 ? `Revolvente: ${currency} ${totalCreditCardDebt.toFixed(2)}. Mínimo: ${currency} ${estimatedDebtPayment.toFixed(2)}.`
                                                            : totalCreditCardBalance > 0 ? `Pago total en caja: ${currency} ${fullPaymentCardsCashOutflow.toFixed(2)}.`
                                                                : "Sin deudas. Bucket para inversión libre."}
                                                    </p>
                                                    {totalCreditCardDebt > 0 && distribution.debtPct === 0
                                                        ? <p className="mt-1 text-[10px] font-medium text-negative-700">Alerta: 0% a deuda con deuda activa.</p>
                                                        : debtBucketShortfall > 0
                                                            ? <p className="mt-1 text-[10px] font-medium text-negative-700">Faltan {currency} {debtBucketShortfall.toFixed(2)} para mínimos.</p>
                                                            : totalCreditCardDebt > 0
                                                                ? <p className="mt-1 text-[10px] font-medium text-positive-700">Cubierto + prepago de {currency} {debtBucketSurplus.toFixed(2)}.</p>
                                                                : <p className="mt-1 text-[10px] text-surface-500">Inversión libre o prepago voluntario.</p>
                                                    }
                                                </div>
                                                {/* Ahorro */}
                                                <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#117068]" />
                                                            <span className="text-xs font-semibold text-[#0f2233]">Ahorro ({distribution.savingsPct}%)</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-[#0f2233]">{currency} {distributionAmounts.savings.toFixed(2)}</span>
                                                    </div>
                                                    {hasSavingsGoals && projectedGoalRows.length > 0 ? (
                                                        <div className="mt-2 space-y-1">
                                                            {projectedGoalRows.map((goal) => (
                                                                <div key={goal.id} className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-surface-700">{goal.name || "Meta"}</span>
                                                                    <span className="font-semibold text-[#0f2233]">+{currency} {goal.projectedContribution.toFixed(2)}/mes</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1.5 text-[10px] text-surface-600">Sin metas definidas. Ahorro general.</p>
                                                    )}
                                                </div>
                                                {/* Deseos */}
                                                <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#eca523]" />
                                                            <span className="text-xs font-semibold text-[#0f2233]">Deseos ({distribution.wantsPct}%)</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-[#0f2233]">{currency} {distributionAmounts.wants.toFixed(2)}</span>
                                                    </div>
                                                    {operationalCashShortfall > 0
                                                        ? <p className="mt-1.5 text-[10px] font-medium text-negative-700">Brecha de {currency} {operationalCashShortfall.toFixed(2)} antes de gastos discrecionales.</p>
                                                        : <p className="mt-1.5 text-[10px] text-surface-600">Libre disposición sin comprometer obligaciones.</p>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>{/* END COLUMN 3 */}
                                </div>{/* END 3-COLUMN GRID */}
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

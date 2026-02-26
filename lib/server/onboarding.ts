import { requireUserContext } from "@/lib/server/context";
import { AccountType, CategoryKind, OrgType, SavingsPriority } from "@/lib/types/finance";
import { logError } from "@/lib/server/logger";
import { z } from "zod";

function defaultOrgName(profileType: OrgType) {
    return profileType === "personal" ? "Mis Finanzas" : "Mi Negocio";
}

const accountTypeSchema = z.enum(["cash", "bank", "credit_card", "loan", "investment"]);
const savingsPrioritySchema = z.enum(["fixed_expenses", "debt_payments", "savings_goals"]);
const distributionRuleSchema = z.enum(["50_30_20", "70_20_10", "80_20", "custom"]);

const financialProfileSchema = z.object({
    monthlyIncomeNet: z.number().finite().min(0),
    additionalIncome: z.number().finite().min(0).optional(),
    partnerContribution: z.number().finite().min(0).optional(),
    salaryFrequency: z.enum(["monthly", "biweekly"]).optional(),
    salaryPaymentDay1: z.number().int().min(1).max(31).optional(),
    salaryPaymentDay2: z.number().int().min(1).max(31).optional(),
    firstFortnightAmount: z.number().finite().min(0).optional(),
    secondFortnightAmount: z.number().finite().min(0).optional(),
    partnerSalaryFrequency: z.enum(["monthly", "biweekly"]).optional(),
    partnerSalaryPaymentDay1: z.number().int().min(1).max(31).optional(),
    partnerSalaryPaymentDay2: z.number().int().min(1).max(31).optional(),
    partnerFirstFortnightAmount: z.number().finite().min(0).optional(),
    partnerSecondFortnightAmount: z.number().finite().min(0).optional(),
    distributionRule: distributionRuleSchema,
    customDistribution: z
        .object({
            needsPct: z.number().finite().min(0).max(100),
            wantsPct: z.number().finite().min(0).max(100),
            savingsPct: z.number().finite().min(0).max(100),
            debtPct: z.number().finite().min(0).max(100),
        })
        .optional(),
    savingsPriorities: z.array(savingsPrioritySchema).min(1).max(3).optional(),
});

const assistantRecommendationSchema = z.object({
    generated_at: z.string().optional(),
    source_model: z.enum(["gemini", "deterministic"]).optional(),
    country: z.string().trim().min(2).max(2),
    currency: z.string().trim().length(3),
    consolidated_income: z.number().finite().min(0),
    recommended_income: z.number().finite().min(0),
    additional_income_needed: z.number().finite().min(0),
    operational_commitment: z.number().finite().min(0),
    required_debt_payment: z.number().finite().min(0),
    required_savings_for_goals: z.number().finite().min(0),
    healthy_plan_pct: z.object({
        needs_pct: z.number().finite().min(0).max(100),
        wants_pct: z.number().finite().min(0).max(100),
        savings_pct: z.number().finite().min(0).max(100),
        debt_pct: z.number().finite().min(0).max(100),
    }),
    healthy_plan_amounts: z.object({
        needs_amount: z.number().finite().min(0),
        wants_amount: z.number().finite().min(0),
        savings_amount: z.number().finite().min(0),
        debt_amount: z.number().finite().min(0),
    }),
    goals: z
        .array(
            z.object({
                id: z.string().trim().min(1).max(64),
                name: z.string().trim().min(1).max(120),
                target_amount: z.number().finite().min(0),
                current_amount: z.number().finite().min(0),
                target_months: z.number().int().min(3).max(240),
                suggested_months: z.number().int().min(3).max(240),
                projected_monthly_contribution: z.number().finite().min(0),
                required_monthly_contribution: z.number().finite().min(0),
                gap_monthly_contribution: z.number().finite().min(0),
            })
        )
        .optional(),
    user_scenario: z
        .object({
            achievable_additional_income: z.number().finite().min(0),
            scenario_income: z.number().finite().min(0),
            scenario_savings_pool: z.number().finite().min(0),
            scenario_income_gap_to_target: z.number().finite().min(0),
            goals: z
                .array(
                    z.object({
                        id: z.string().trim().min(1).max(64),
                        name: z.string().trim().min(1).max(120),
                        scenario_monthly_contribution: z.number().finite().min(0),
                        scenario_eta_months: z.number().int().min(1).max(480).nullable(),
                        meets_target: z.boolean(),
                    })
                )
                .max(30),
        })
        .optional(),
    summary: z.string().trim().min(1).max(4000),
    action_items: z.array(z.string().trim().min(1).max(240)).max(10).optional(),
});

const onboardingSetupSchema = z.object({
    orgName: z.string().trim().min(2).max(120).optional(),
    country: z.string().trim().min(2).max(2).optional(),
    currency: z.string().trim().length(3).optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
    preferredLocale: z.enum(["es", "en"]).optional(),
    startDate: z.string().trim().optional(),
    accountingBasis: z.enum(["cash_basis", "accrual_basis"]).optional(),
    fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
    detraccionesEnabled: z.boolean().optional(),
    legalName: z.string().trim().min(2).max(120).optional(),
    taxId: z.string().trim().max(64).optional(),
    firstAccount: z
        .object({
            name: z.string().trim().min(2).max(120),
            accountType: accountTypeSchema,
            openingBalance: z.number().finite(),
            currency: z.string().trim().length(3).optional(),
        })
        .optional(),
    creditCards: z
        .array(
            z.object({
                name: z.string().trim().min(1).max(120),
                creditLimit: z.number().finite().positive(),
                currentBalance: z.number().finite(), // This is usually positive or 0 (debt)
                paymentDay: z.number().int().min(1).max(31).optional(),
                paymentStrategy: z.enum(["full", "minimum", "fixed"]).optional(),
                minimumPaymentAmount: z.number().finite().min(0).optional(),
                tea: z.number().finite().min(0).optional(),
                hasDesgravamen: z.boolean().optional(),
                desgravamenAmount: z.number().finite().min(0).optional(),
            })
        )
        .optional(),
    subscriptions: z
        .array(
            z.object({
                name: z.string().trim().min(1).max(120),
                monthlyCost: z.number().finite().min(0),
                billingDay: z.number().int().min(1).max(31),
            })
        )
        .optional(),
    savingsGoals: z
        .array(
            z.object({
                name: z.string().trim().min(1).max(120),
                targetAmount: z.number().finite().positive(),
                goalWeight: z.number().finite().positive().optional(),
                deadlineDate: z.string().nullable().optional(),
            })
        )
        .optional(),
    forecast: z
        .object({
            revenueGrowthRate: z.number().finite().optional(),
            cogsPercent: z.number().finite().optional(),
            fixedOpex: z.number().finite().optional(),
            variableOpexPercent: z.number().finite().optional(),
            oneOffAmount: z.number().finite().optional(),
            note: z.string().trim().max(600).optional(),
        })
        .optional(),
    customCategories: z
        .array(
            z.object({
                name: z.string().trim().min(1).max(120),
                kind: z.enum(["income", "expense", "cost_of_goods_sold", "transfer", "equity", "asset", "liability"]),
            })
        )
        .optional(),
    initialBudgets: z
        .array(
            z.object({
                categoryName: z.string().trim().min(1),
                amount: z.number().finite(),
            })
        )
        .optional(),
    financialProfile: financialProfileSchema.optional(),
    assistantRecommendation: assistantRecommendationSchema.optional(),
});

type SeedCategory = {
    name: string;
    kind: CategoryKind;
    sort_order: number;
    fixed_cost?: boolean;
    variable_cost?: boolean;
};

const PERSONAL_CATEGORY_SEED: SeedCategory[] = [
    { name: "Salary", kind: "income", sort_order: 1 },
    { name: "Freelance", kind: "income", sort_order: 2 },
    { name: "Investments", kind: "income", sort_order: 3 },
    { name: "Rental Income", kind: "income", sort_order: 4 },
    { name: "Other Income", kind: "income", sort_order: 5 },
    { name: "Housing", kind: "expense", sort_order: 10 },
    { name: "Utilities", kind: "expense", sort_order: 11 },
    { name: "Groceries", kind: "expense", sort_order: 12 },
    { name: "Transportation", kind: "expense", sort_order: 13 },
    { name: "Healthcare", kind: "expense", sort_order: 14 },
    { name: "Insurance", kind: "expense", sort_order: 15 },
    { name: "Education", kind: "expense", sort_order: 16 },
    { name: "Entertainment", kind: "expense", sort_order: 17 },
    { name: "Dining Out", kind: "expense", sort_order: 18 },
    { name: "Shopping", kind: "expense", sort_order: 19 },
    { name: "Subscriptions", kind: "expense", sort_order: 20 },
    { name: "Personal Care", kind: "expense", sort_order: 21 },
    { name: "Debt Payments", kind: "expense", sort_order: 22 },
    { name: "Savings", kind: "expense", sort_order: 23 },
    { name: "Other Expenses", kind: "expense", sort_order: 24 },
    { name: "Transfer", kind: "transfer", sort_order: 30 },
];

const BUSINESS_CATEGORY_SEED: SeedCategory[] = [
    { name: "Product Sales", kind: "revenue", sort_order: 1 },
    { name: "Service Revenue", kind: "revenue", sort_order: 2 },
    { name: "Subscription Revenue", kind: "revenue", sort_order: 3 },
    { name: "Other Revenue", kind: "revenue", sort_order: 4 },
    { name: "Raw Materials", kind: "cogs", sort_order: 10, variable_cost: true },
    { name: "Direct Labor", kind: "cogs", sort_order: 11, variable_cost: true },
    { name: "Manufacturing Overhead", kind: "cogs", sort_order: 12, fixed_cost: true },
    { name: "Shipping & Fulfillment", kind: "cogs", sort_order: 13, variable_cost: true },
    { name: "Rent & Facilities", kind: "opex", sort_order: 20, fixed_cost: true },
    { name: "Salaries & Benefits", kind: "opex", sort_order: 21, fixed_cost: true },
    { name: "Insurance", kind: "opex", sort_order: 22, fixed_cost: true },
    { name: "Software & Tools", kind: "opex", sort_order: 23, fixed_cost: true },
    { name: "Professional Services", kind: "opex", sort_order: 24, fixed_cost: true },
    { name: "Depreciation", kind: "opex", sort_order: 25, fixed_cost: true },
    { name: "Marketing & Advertising", kind: "opex", sort_order: 30, variable_cost: true },
    { name: "Sales Commissions", kind: "opex", sort_order: 31, variable_cost: true },
    { name: "Travel & Entertainment", kind: "opex", sort_order: 32, variable_cost: true },
    { name: "Office Supplies", kind: "opex", sort_order: 33, variable_cost: true },
    { name: "Utilities", kind: "opex", sort_order: 34, variable_cost: true },
    { name: "Income Tax", kind: "tax", sort_order: 40 },
    { name: "Sales Tax / VAT", kind: "tax", sort_order: 41 },
    { name: "Internal Transfer", kind: "transfer", sort_order: 50 },
];

const BUSINESS_COST_CENTER_SEED = ["Operations", "Commercial", "Administration"];

export type OnboardingSetupInput = z.infer<typeof onboardingSetupSchema>;

const DEFAULT_SAVINGS_PRIORITIES: SavingsPriority[] = [
    "fixed_expenses",
    "debt_payments",
    "savings_goals",
];

const DISTRIBUTION_PRESETS: Record<
    z.infer<typeof distributionRuleSchema>,
    { needsPct: number; wantsPct: number; savingsPct: number; debtPct: number }
> = {
    "50_30_20": { needsPct: 50, wantsPct: 30, savingsPct: 20, debtPct: 0 },
    "70_20_10": { needsPct: 70, wantsPct: 0, savingsPct: 20, debtPct: 10 },
    "80_20": { needsPct: 80, wantsPct: 0, savingsPct: 20, debtPct: 0 },
    custom: { needsPct: 50, wantsPct: 30, savingsPct: 20, debtPct: 0 },
};

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function normalizePriorities(input?: SavingsPriority[]): SavingsPriority[] {
    if (!input || input.length === 0) return DEFAULT_SAVINGS_PRIORITIES;
    const unique = Array.from(new Set(input)) as SavingsPriority[];
    for (const item of DEFAULT_SAVINGS_PRIORITIES) {
        if (!unique.includes(item)) unique.push(item);
    }
    return unique.slice(0, 3);
}

function resolveFinancialDistribution(
    financialProfile: OnboardingSetupInput["financialProfile"]
) {
    const rule = financialProfile?.distributionRule ?? "50_30_20";
    if (rule !== "custom") return { rule, ...DISTRIBUTION_PRESETS[rule] };

    const custom = financialProfile?.customDistribution ?? DISTRIBUTION_PRESETS.custom;
    const total =
        custom.needsPct + custom.wantsPct + custom.savingsPct + custom.debtPct;

    if (Math.abs(total - 100) > 0.01) {
        throw new Error("La distribución personalizada debe sumar 100%");
    }

    return {
        rule,
        needsPct: custom.needsPct,
        wantsPct: custom.wantsPct,
        savingsPct: custom.savingsPct,
        debtPct: custom.debtPct,
    };
}

function estimateTotalCreditCardMinimums(setup: OnboardingSetupInput) {
    const cards = setup.creditCards || [];
    const revolvingCards = cards.filter(card => card.paymentStrategy !== "full");
    return round2(
        revolvingCards.reduce((sum, card) => {
            const statedMin = card.minimumPaymentAmount || 0;
            if (statedMin > 0) return sum + statedMin;
            return sum + (Math.max(card.currentBalance, 0) * 0.05);
        }, 0)
    );
}

function estimateTotalExpenseBudget(setup: OnboardingSetupInput) {
    const budgets = setup.initialBudgets || [];
    const subscriptions = setup.subscriptions || [];
    const subscriptionsTotal = round2(
        subscriptions.reduce((sum, subscription) => {
            if (subscription.monthlyCost <= 0) return sum;
            return sum + subscription.monthlyCost;
        }, 0)
    );
    return round2(
        budgets.reduce((sum, budget) => {
            if (budget.amount <= 0) return sum;
            return sum + budget.amount;
        }, 0) + subscriptionsTotal
    );
}

function estimateFullPaymentCardsCashOutflow(setup: OnboardingSetupInput) {
    const cards = setup.creditCards || [];
    return round2(
        cards
            .filter((card) => card.paymentStrategy === "full")
            .reduce((sum, card) => sum + Math.max(card.currentBalance, 0), 0)
    );
}

function resolveMonthlyGoalsPool(setup: OnboardingSetupInput) {
    if (!setup.financialProfile) return 0;

    const distribution = resolveFinancialDistribution(setup.financialProfile);
    const consolidatedIncome =
        setup.financialProfile.monthlyIncomeNet +
        (setup.financialProfile.additionalIncome ?? 0) +
        (setup.financialProfile.partnerContribution ?? 0);

    const needsBucket = round2((consolidatedIncome * distribution.needsPct) / 100);
    const wantsBucket = round2((consolidatedIncome * distribution.wantsPct) / 100);
    const savingsBucket = round2(
        (consolidatedIncome * distribution.savingsPct) / 100
    );
    const debtBucket = round2((consolidatedIncome * distribution.debtPct) / 100);

    const totalExpenseBudget = estimateTotalExpenseBudget(setup);
    const fullPaymentCardsCashOutflow = estimateFullPaymentCardsCashOutflow(setup);
    const operationalCashRequired = round2(
        totalExpenseBudget + fullPaymentCardsCashOutflow
    );
    const operationalBucket = round2(needsBucket + wantsBucket);
    const operationalCashShortfall = Math.max(
        operationalCashRequired - operationalBucket,
        0
    );

    const estimatedDebtPayment = estimateTotalCreditCardMinimums(setup);
    const debtBucketShortfall = Math.max(estimatedDebtPayment - debtBucket, 0);

    const priorities = normalizePriorities(
        setup.financialProfile.savingsPriorities
    );
    const fixedIndex = priorities.indexOf("fixed_expenses");
    const debtIndex = priorities.indexOf("debt_payments");
    const goalsIndex = priorities.indexOf("savings_goals");

    let availableForGoals = savingsBucket;
    if (goalsIndex !== -1 && fixedIndex !== -1 && fixedIndex < goalsIndex) {
        availableForGoals -= operationalCashShortfall;
    }
    if (goalsIndex !== -1 && debtIndex !== -1 && debtIndex < goalsIndex) {
        availableForGoals -= debtBucketShortfall;
    }

    return round2(Math.max(availableForGoals, 0));
}

function addMonthsIso(baseDate: Date, months: number) {
    const result = new Date(baseDate);
    result.setMonth(result.getMonth() + months);
    return result.toISOString().slice(0, 10);
}

function isMissingRelationError(error: unknown, relationName: string) {
    const normalized = normalizeSupabaseError(error);
    const details = normalized.message.toLowerCase();
    return (
        details.includes("42p01") &&
        details.includes(relationName.toLowerCase())
    );
}

function isMissingColumnError(
    error: unknown,
    tableName: string,
    columnNames: string[]
) {
    const normalized = normalizeSupabaseError(error);
    const details = normalized.message.toLowerCase();
    const normalizedTable = tableName.toLowerCase();

    if (!details.includes("42703") && !details.includes("does not exist")) {
        return false;
    }
    if (!details.includes(`column ${normalizedTable}.`)) {
        return false;
    }

    return columnNames.some((columnName) =>
        details.includes(`${normalizedTable}.${columnName.toLowerCase()}`)
    );
}

function computeGoalRowsFromOnboarding(
    orgId: string,
    setup: OnboardingSetupInput
) {
    const goals = setup.savingsGoals || [];
    if (goals.length === 0) return [];

    const today = new Date();
    const projectionBaseDate = setup.startDate
        ? new Date(`${setup.startDate}T00:00:00`)
        : today;
    const safeProjectionBaseDate =
        Number.isNaN(projectionBaseDate.getTime()) ? today : projectionBaseDate;

    const totalGoalWeights = goals.reduce(
        (sum, goal) => sum + (goal.goalWeight ?? 1),
        0
    );
    const totalTargets = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const profileSavingsPool = resolveMonthlyGoalsPool(setup);
    const fallbackSavingsPool = totalTargets > 0 ? round2(totalTargets / 12) : 0;
    const monthlySavingsPool =
        setup.financialProfile ? profileSavingsPool : fallbackSavingsPool;

    let allocatedSavings = 0;
    return goals.map((goal, index) => {
        const goalWeight = goal.goalWeight ?? 1;
        const contributionRaw =
            totalGoalWeights > 0
                ? (monthlySavingsPool * goalWeight) / totalGoalWeights
                : 0;
        const monthlyContribution =
            index === goals.length - 1
                ? round2(Math.max(monthlySavingsPool - allocatedSavings, 0))
                : round2(contributionRaw);
        allocatedSavings = round2(allocatedSavings + monthlyContribution);

        const monthsToGoal =
            monthlyContribution > 0
                ? Math.ceil(goal.targetAmount / monthlyContribution)
                : null;
        const estimatedCompletionDate =
            monthsToGoal && Number.isFinite(monthsToGoal)
                ? addMonthsIso(safeProjectionBaseDate, monthsToGoal)
                : null;

        return {
            org_id: orgId,
            name: goal.name,
            target_amount: goal.targetAmount,
            current_amount: 0,
            goal_weight: goalWeight,
            monthly_contribution: monthlyContribution,
            estimated_completion_date: estimatedCompletionDate,
            deadline_date: goal.deadlineDate || null,
        };
    });
}

function normalizeCurrency(value: string | undefined): string | undefined {
    if (!value) return undefined;
    return value.trim().toUpperCase();
}

function normalizeCategoryName(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

const ONBOARDING_BUDGET_CATEGORY_ALIASES: Record<string, string> = {
    vivienda: "Housing",
    alimentacion: "Groceries",
    alimentos: "Groceries",
    transporte: "Transportation",
    salud: "Healthcare",
    suscripcion: "Software & Tools",
    suscripciones: "Software & Tools",
    subscription: "Software & Tools",
    subscriptions: "Software & Tools",
    operaciones: "Rent & Facilities",
    sueldos: "Salaries & Benefits",
    marketing: "Marketing & Advertising",
    software: "Software & Tools",
};

function resolveBudgetCategoryCandidates(categoryName: string) {
    const alias = ONBOARDING_BUDGET_CATEGORY_ALIASES[normalizeCategoryName(categoryName)];
    return alias ? [alias, categoryName] : [categoryName];
}

function normalizeSupabaseError(error: unknown) {
    if (error instanceof Error) return error;
    if (typeof error === "object" && error !== null) {
        const maybeError = error as {
            message?: unknown;
            details?: unknown;
            hint?: unknown;
            code?: unknown;
        };
        const parts = [
            typeof maybeError.message === "string" ? maybeError.message : null,
            typeof maybeError.details === "string" ? maybeError.details : null,
            typeof maybeError.hint === "string" ? maybeError.hint : null,
            typeof maybeError.code === "string" ? `code=${maybeError.code}` : null,
        ].filter(Boolean);

        if (parts.length > 0) {
            return new Error(parts.join(" | "));
        }

        try {
            return new Error(JSON.stringify(error));
        } catch {
            return new Error("Error desconocido en onboarding");
        }
    }
    return new Error(String(error));
}

function shouldFallbackRpc(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const value = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof value.code === "string" ? value.code : "";
    const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
    const details = typeof value.details === "string" ? value.details.toLowerCase() : "";

    if (code === "PGRST202" || code === "42883" || code === "42501") return true;
    if (message.includes("could not find function")) return true;
    if (message.includes("permission denied for function")) return true;
    if (details.includes("schema cache")) return true;

    return false;
}

function mapInitialAccounts(profileType: OrgType, setup: OnboardingSetupInput) {
    const accounts: Array<{
        name: string;
        account_type: AccountType;
        opening_balance: number;
        currency: string;
        is_restricted_cash?: boolean;
    }> = [];

    const baseCurrency =
        normalizeCurrency(setup.currency) ||
        normalizeCurrency(setup.firstAccount?.currency) ||
        "USD";

    const appendPartnerSharedAccount = () => {
        if (profileType !== "personal") return;

        const partnerContribution = round2(
            Math.max(setup.financialProfile?.partnerContribution ?? 0, 0)
        );
        if (partnerContribution <= 0) return;

        const alreadyExists = accounts.some((account) => {
            const normalizedName = account.name.trim().toLowerCase();
            return (
                normalizedName.includes("cuenta compartida") ||
                normalizedName.includes("shared account")
            );
        });

        if (alreadyExists) return;

        accounts.push({
            name: "Cuenta compartida (pareja)",
            account_type: "bank",
            opening_balance: partnerContribution,
            currency: baseCurrency,
        });
    };

    if (setup.firstAccount) {
        accounts.push({
            name: setup.firstAccount.name,
            account_type: setup.firstAccount.accountType,
            opening_balance: setup.firstAccount.openingBalance,
            currency: normalizeCurrency(setup.firstAccount.currency) || baseCurrency,
        });

        appendPartnerSharedAccount();
        return accounts;
    }

    if (profileType === "personal") {
        accounts.push({
            name: "Cuenta principal",
            account_type: "bank",
            opening_balance: 0,
            currency: baseCurrency,
        });

        appendPartnerSharedAccount();
        return accounts;
    }

    accounts.push(
        {
            name: "Banco principal",
            account_type: "bank",
            opening_balance: 0,
            currency: baseCurrency,
        },
        {
            name: "Caja chica",
            account_type: "cash",
            opening_balance: 0,
            currency: baseCurrency,
        }
    );

    if (setup.detraccionesEnabled) {
        accounts.push({
            name: "Detracciones (Restricted Cash)",
            account_type: "bank",
            opening_balance: 0,
            currency: baseCurrency,
            is_restricted_cash: true,
        });
    }

    return accounts;
}

async function seedCategoriesForOrg(
    supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
    orgId: string,
    profileType: OrgType
) {
    const { count, error: countError } = await supabase
        .from("categories_gl")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

    if (countError) throw normalizeSupabaseError(countError);
    if ((count || 0) > 0) return;

    const seed = profileType === "business" ? BUSINESS_CATEGORY_SEED : PERSONAL_CATEGORY_SEED;
    const rows = seed.map((item) => ({
        org_id: orgId,
        name: item.name,
        kind: item.kind,
        sort_order: item.sort_order,
        fixed_cost: Boolean(item.fixed_cost),
        variable_cost: Boolean(item.variable_cost),
    }));

    const { error } = await supabase.from("categories_gl").insert(rows);
    if (error) throw normalizeSupabaseError(error);
}

async function seedCostCentersForBusinessOrg(
    supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
    orgId: string
) {
    const { count, error: countError } = await supabase
        .from("cost_centers")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
    if (countError) throw normalizeSupabaseError(countError);
    if ((count || 0) > 0) return;

    const rows = BUSINESS_COST_CENTER_SEED.map((name) => ({ org_id: orgId, name }));
    const { error } = await supabase.from("cost_centers").insert(rows);
    if (error) throw normalizeSupabaseError(error);
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/env";

function getAdminClient(fallbackClient: Awaited<ReturnType<typeof requireUserContext>>["supabase"]) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) return fallbackClient;
    return createSupabaseClient(getSupabaseUrl(), serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}

async function createOrgWithFallback(
    supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
    userId: string,
    profileType: OrgType,
    orgName: string,
    country: string,
    currency: string
) {
    let createdOrgId: string | null = null;
    const adminClient = getAdminClient(supabase);

    try {
        const { data: org, error: orgError } = await adminClient
            .from("orgs")
            .insert({
                type: profileType,
                name: orgName,
                country,
                currency,
            })
            .select("id")
            .single();
        if (orgError || !org?.id) {
            throw normalizeSupabaseError(orgError || new Error("No se pudo crear la organización"));
        }
        createdOrgId = String(org.id);

        const { error: memberError } = await adminClient.from("org_members").insert({
            org_id: createdOrgId,
            user_id: userId,
            role: "owner",
        });
        if (memberError) throw normalizeSupabaseError(memberError);

        const { error: onboardingError } = await adminClient.from("onboarding_state").upsert(
            {
                org_id: createdOrgId,
                user_id: userId,
                profile_type: profileType,
                step: 1,
                answers: {},
                completed_at: null,
            },
            { onConflict: "org_id,user_id" }
        );
        if (onboardingError) throw normalizeSupabaseError(onboardingError);

        await seedCategoriesForOrg(adminClient, createdOrgId, profileType);
        if (profileType === "business") {
            await seedCostCentersForBusinessOrg(adminClient, createdOrgId);
        }

        return createdOrgId;
    } catch (error) {
        if (createdOrgId) {
            await adminClient.from("orgs").delete().eq("id", createdOrgId);
        }
        throw normalizeSupabaseError(error);
    }
}

export async function createOrganizationWithOnboarding(
    profileType: OrgType,
    setupInput?: OnboardingSetupInput
) {
    const { supabase, user } = await requireUserContext();
    const safeSetup = onboardingSetupSchema.parse(setupInput || {});
    const orgName = safeSetup.orgName || defaultOrgName(profileType);
    const country = safeSetup.country?.toUpperCase() || "US";
    const currency = normalizeCurrency(safeSetup.currency) || "USD";

    let orgId: string;
    const rpcResult = await supabase.rpc("create_org_with_onboarding", {
        p_profile_type: profileType,
        p_org_name: orgName,
        p_country: country,
        p_currency: currency,
    });

    if (rpcResult.error) {
        logError("Error calling onboarding RPC", normalizeSupabaseError(rpcResult.error), {
            profileType,
        });

        if (!shouldFallbackRpc(rpcResult.error)) {
            throw normalizeSupabaseError(rpcResult.error);
        }

        orgId = await createOrgWithFallback(
            supabase,
            user.id,
            profileType,
            orgName,
            country,
            currency
        );
    } else if (!rpcResult.data) {
        throw new Error("No se pudo crear la organización");
    } else {
        orgId = String(rpcResult.data);
    }

    const orgUpdate: Record<string, unknown> = {
        name: orgName,
        country,
        currency,
    };

    if (safeSetup.timezone) orgUpdate.timezone = safeSetup.timezone;
    if (safeSetup.preferredLocale) orgUpdate.preferred_locale = safeSetup.preferredLocale;
    if (profileType === "business") {
        if (safeSetup.accountingBasis) orgUpdate.accounting_basis = safeSetup.accountingBasis;
        if (safeSetup.fiscalYearStartMonth) orgUpdate.fiscal_year_start = safeSetup.fiscalYearStartMonth;
        if (typeof safeSetup.detraccionesEnabled === "boolean") {
            orgUpdate.detracciones_enabled = safeSetup.detraccionesEnabled;
        }
    }

    const { error: orgUpdateError } = await supabase.from("orgs").update(orgUpdate).eq("id", orgId);
    if (orgUpdateError) {
        logError("Error updating onboarding org settings", orgUpdateError, { orgId, profileType });
        throw new Error("No se pudo guardar la configuración de la organización");
    }

    if (profileType === "personal" && safeSetup.financialProfile) {
        const distribution = resolveFinancialDistribution(safeSetup.financialProfile);
        const savingsPriorities = normalizePriorities(
            safeSetup.financialProfile.savingsPriorities
        );
        const { error: profileError } = await supabase
            .from("org_financial_profile")
            .upsert(
                {
                    org_id: orgId,
                    monthly_income_net: safeSetup.financialProfile.monthlyIncomeNet,
                    additional_income: safeSetup.financialProfile.additionalIncome ?? 0,
                    partner_contribution:
                        safeSetup.financialProfile.partnerContribution ?? 0,
                    distribution_rule: distribution.rule,
                    needs_pct: distribution.needsPct,
                    wants_pct: distribution.wantsPct,
                    savings_pct: distribution.savingsPct,
                    debt_pct: distribution.debtPct,
                    savings_priorities: savingsPriorities,
                    salary_frequency: safeSetup.financialProfile.salaryFrequency,
                    salary_payment_day_1: safeSetup.financialProfile.salaryPaymentDay1,
                    salary_payment_day_2: safeSetup.financialProfile.salaryPaymentDay2,
                    first_fortnight_amount: safeSetup.financialProfile.firstFortnightAmount,
                    second_fortnight_amount: safeSetup.financialProfile.secondFortnightAmount,
                    partner_salary_frequency: safeSetup.financialProfile.partnerSalaryFrequency,
                    partner_salary_payment_day_1: safeSetup.financialProfile.partnerSalaryPaymentDay1,
                    partner_salary_payment_day_2: safeSetup.financialProfile.partnerSalaryPaymentDay2,
                    partner_first_fortnight_amount: safeSetup.financialProfile.partnerFirstFortnightAmount,
                    partner_second_fortnight_amount: safeSetup.financialProfile.partnerSecondFortnightAmount,
                },
                { onConflict: "org_id" }
            );

        if (profileError) {
            logError("Error creating org financial profile", profileError, { orgId });
            if (isMissingRelationError(profileError, "org_financial_profile")) {
                throw new Error(
                    "No se pudo guardar el perfil financiero porque falta migrar ese módulo en Supabase. Ejecuta: npm run supabase:migrate:remote"
                );
            }
            if (
                isMissingColumnError(profileError, "org_financial_profile", [
                    "salary_frequency",
                    "salary_payment_day_1",
                    "salary_payment_day_2",
                    "first_fortnight_amount",
                    "second_fortnight_amount",
                    "partner_salary_frequency",
                    "partner_salary_payment_day_1",
                    "partner_salary_payment_day_2",
                    "partner_first_fortnight_amount",
                    "partner_second_fortnight_amount",
                ])
            ) {
                throw new Error(
                    "No se pudo guardar el perfil financiero porque faltan columnas de sueldos/quincenas en Supabase. Ejecuta: npm run supabase:migrate:remote (incluye migración 012)."
                );
            }
            throw new Error("No se pudo guardar el perfil financiero inicial");
        }
    }

    const { count: accountCount, error: accountCountError } = await supabase
        .from("accounts")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
    if (accountCountError) {
        logError("Error counting onboarding accounts", accountCountError, { orgId, profileType });
        throw new Error("No se pudo preparar la organización");
    }

    if (!accountCount || accountCount === 0) {
        const accounts = mapInitialAccounts(profileType, safeSetup).map((account) => ({
            org_id: orgId,
            name: account.name,
            account_type: account.account_type,
            currency: account.currency,
            opening_balance: account.opening_balance,
            is_restricted_cash: Boolean(account.is_restricted_cash),
        }));

        if (accounts.length > 0) {
            const { error: accountsError } = await supabase.from("accounts").insert(accounts);
            if (accountsError) {
                logError("Error creating onboarding accounts", accountsError, { orgId, profileType });
                throw new Error("No se pudieron crear las cuentas iniciales");
            }
        }
    }

    if (safeSetup.creditCards && safeSetup.creditCards.length > 0) {
        const ccRows = safeSetup.creditCards.map((cc) => ({
            org_id: orgId,
            name: cc.name,
            account_type: "credit_card",
            currency: normalizeCurrency(safeSetup.currency) || "USD",
            opening_balance: -Math.abs(cc.currentBalance), // Represent current debt as negative balance
            credit_limit: cc.creditLimit,
            payment_day: cc.paymentDay,
            card_payment_strategy: cc.paymentStrategy,
            minimum_payment_amount: cc.minimumPaymentAmount,
            tea: cc.tea,
            has_desgravamen: cc.hasDesgravamen,
            desgravamen_amount: cc.desgravamenAmount,
            is_restricted_cash: false,
        }));

        const { error: ccError } = await supabase.from("accounts").insert(ccRows);
        if (ccError) {
            logError("Error creating credit card accounts", ccError, { orgId });
            if (
                isMissingColumnError(ccError, "accounts", [
                    "payment_day",
                    "card_payment_strategy",
                    "minimum_payment_amount",
                    "tea",
                    "has_desgravamen",
                    "desgravamen_amount",
                ])
            ) {
                throw new Error(
                    "No se pudieron crear las tarjetas porque faltan columnas en accounts. Ejecuta: npm run supabase:migrate:remote (migraciones 012 y 013)."
                );
            }
            throw new Error("No se pudieron crear las tarjetas de crédito");
        }
    }

    if (safeSetup.savingsGoals && safeSetup.savingsGoals.length > 0) {
        const goalRows = computeGoalRowsFromOnboarding(orgId, safeSetup);

        const { error: goalsError } = await supabase.from("savings_goals").insert(goalRows);
        if (goalsError) {
            logError("Error creating savings goals", goalsError, { orgId });
            if (
                isMissingRelationError(goalsError, "savings_goals")
            ) {
                throw new Error(
                    "No se pudieron crear las metas de ahorro porque falta migrar ese módulo en Supabase. Ejecuta: npm run supabase:migrate:remote"
                );
            }
            const normalized = normalizeSupabaseError(goalsError);
            const details = normalized.message.toLowerCase();
            if (
                details.includes("monthly_contribution") ||
                details.includes("goal_weight") ||
                details.includes("estimated_completion_date")
            ) {
                throw new Error(
                    "No se pudieron crear las metas de ahorro porque faltan columnas de proyección en Supabase. Ejecuta: npm run supabase:migrate:remote"
                );
            }
            throw new Error("No se pudieron crear las metas de ahorro");
        }

        // ── AUTO-CREATE "Ahorro / Metas" category + budget entry ──
        const { data: savingsCategory, error: savCatError } = await supabase
            .from("categories_gl")
            .insert({
                org_id: orgId,
                name: "Ahorro / Metas",
                kind: profileType === "business" ? "opex" : "expense",
                fixed_cost: true,
                variable_cost: false,
                is_active: true,
                sort_order: 999,
            })
            .select("id")
            .single();

        if (!savCatError && savingsCategory) {
            const totalTargets = safeSetup.savingsGoals.reduce(
                (sum, goal) => sum + goal.targetAmount,
                0
            );
            const profileSavingsPool = resolveMonthlyGoalsPool(safeSetup);
            const monthlyContribution =
                safeSetup.financialProfile
                    ? profileSavingsPool
                    : round2(totalTargets / 12);

            if (monthlyContribution > 0) {
                const currentMonth = new Date().toISOString().slice(0, 7);
                await supabase.from("budgets").insert({
                    org_id: orgId,
                    month: currentMonth,
                    category_gl_id: savingsCategory.id,
                    cost_center_id: null,
                    amount: monthlyContribution,
                });
            }
        }
    }

    if (profileType === "business" && safeSetup.forecast) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { error: forecastError } = await supabase.from("forecast_assumptions").upsert(
            {
                org_id: orgId,
                month: currentMonth,
                revenue_growth_rate: safeSetup.forecast.revenueGrowthRate ?? null,
                cogs_percent: safeSetup.forecast.cogsPercent ?? null,
                fixed_opex: safeSetup.forecast.fixedOpex ?? null,
                variable_opex_percent: safeSetup.forecast.variableOpexPercent ?? null,
                one_off_amount: safeSetup.forecast.oneOffAmount ?? null,
                note: safeSetup.forecast.note ?? null,
            },
            { onConflict: "org_id,month" }
        );

        if (forecastError) {
            logError("Error creating onboarding forecast assumptions", forecastError, { orgId });
            throw new Error("No se pudo guardar el pronóstico inicial");
        }
    }

    // Process Custom Categories
    if (safeSetup.customCategories && safeSetup.customCategories.length > 0) {
        const customCategoriesRows = safeSetup.customCategories.map((c, idx) => ({
            org_id: orgId,
            name: c.name,
            kind:
                c.kind === "cost_of_goods_sold"
                    ? "cogs"
                    : c.kind === "asset" || c.kind === "equity" || c.kind === "liability"
                        ? "expense"
                        : c.kind,
            sort_order: 1000 + idx, // Ensure they appear after default ones
            fixed_cost: false,
            variable_cost: false,
        }));

        const { error: customCatError } = await supabase.from("categories_gl").insert(customCategoriesRows);
        if (customCatError) {
            logError("Error creating custom categories", customCatError, { orgId });
        }
    }

    const onboardingBudgetRows = [...(safeSetup.initialBudgets || [])];
    if (safeSetup.subscriptions && safeSetup.subscriptions.length > 0) {
        const subscriptionsTotal = round2(
            safeSetup.subscriptions.reduce((sum, subscription) => {
                if (subscription.monthlyCost <= 0) return sum;
                return sum + subscription.monthlyCost;
            }, 0)
        );
        if (subscriptionsTotal > 0) {
            onboardingBudgetRows.push({
                categoryName: "Subscriptions",
                amount: subscriptionsTotal,
            });
        }
    }

    // Process Initial Budgets (including subscriptions total)
    if (onboardingBudgetRows.length > 0) {
        // We need to fetch the category IDs first because we only have the names from the frontend
        const { data: allCategories, error: fetchCatError } = await supabase
            .from("categories_gl")
            .select("id, name")
            .eq("org_id", orgId);

        if (!fetchCatError && allCategories) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const categoryByNormalizedName = new Map<string, { id: string; name: string }>();
            for (const category of allCategories) {
                categoryByNormalizedName.set(normalizeCategoryName(category.name), category);
            }

            const budgetRowsByCategoryId = new Map<string, {
                org_id: string;
                month: string;
                category_gl_id: string;
                cost_center_id: null;
                amount: number;
            }>();

            for (const budget of onboardingBudgetRows) {
                if (budget.amount <= 0) continue;
                const candidates = resolveBudgetCategoryCandidates(budget.categoryName);
                const category = candidates
                    .map((candidate) => categoryByNormalizedName.get(normalizeCategoryName(candidate)))
                    .find(Boolean);

                if (!category) continue;

                budgetRowsByCategoryId.set(category.id, {
                    org_id: orgId,
                    month: currentMonth,
                    category_gl_id: category.id,
                    cost_center_id: null,
                    amount: budget.amount,
                });
            }

            const budgetRows = Array.from(budgetRowsByCategoryId.values());
            if (budgetRows.length > 0) {
                const { error: budgetError } = await supabase.from("budgets").insert(budgetRows);
                if (budgetError) {
                    logError("Error creating initial budgets", budgetError, { orgId });
                }
            }
        }
    }

    if (profileType === "personal" && safeSetup.assistantRecommendation) {
        const { error: assistantInsightError } = await supabase
            .from("assistant_insights")
            .insert({
                org_id: orgId,
                user_id: user.id,
                source: "onboarding_income_plan",
                title: "Plan de ingresos recomendado (Onboarding)",
                recommendation: safeSetup.assistantRecommendation,
            });

        if (assistantInsightError) {
            logError("Error storing assistant onboarding insight", assistantInsightError, {
                orgId,
                userId: user.id,
            });
        }
    }

    const answers = {
        ...safeSetup,
        profile_type: profileType,
        legal_name: safeSetup.legalName,
        tax_id: safeSetup.taxId,
        start_date: safeSetup.startDate,
        completed_at: new Date().toISOString(),
    };

    const { error: onboardingError } = await supabase.from("onboarding_state").upsert(
        {
            org_id: orgId,
            user_id: user.id,
            profile_type: profileType,
            step: 9,
            answers,
            completed_at: new Date().toISOString(),
        },
        { onConflict: "org_id,user_id" }
    );
    if (onboardingError) {
        logError("Error finalizing onboarding state", onboardingError, { orgId, userId: user.id });
        throw new Error("No se pudo finalizar el onboarding");
    }

    return orgId;
}

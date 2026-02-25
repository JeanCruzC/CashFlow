"use server";

import { getOrgContextOrNull, requireOrgContext } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";
import { calculateBusinessKPIs, calculatePersonalKPIs } from "@/lib/utils/kpi";
import {
    Account,
    Budget,
    CategoryGL,
    Transaction,
    SavingsGoal,
    OrgFinancialProfile,
    SavingsPriority,
} from "@/lib/types/finance";
import { computeBusinessForecast } from "@/lib/server/forecast-engine";

export interface PersonalDashboardKPIs {
    netCashFlow: number;
    savingsRatePct: number;
    assets: number;
    liabilities: number;
    netWorth: number;
    emergencyFundMonths: number;
    avgMonthlyExpenses: number;
    expenseMonthsObserved: number;
    liquidCash: number;
    budgetVariance: number;
}

export interface BusinessDashboardKPIs {
    revenue: number;
    cogs: number;
    opex: number;
    operatingIncome: number;
    operatingMarginPct: number;
    budgetVariance: number;
    forecastRevenue: number;
    forecastEbit: number;
    restrictedCash: number;
}

export interface MonthlyTrendPoint {
    month: string;
    income: number;
    expenses: number;
}

export interface DashboardKPIs {
    orgType: "personal" | "business";
    currency: string;
    locale: "es" | "en";
    monthlyTrend: MonthlyTrendPoint[];
    savingsGoals?: SavingsGoal[];
    financialProfile?: OrgFinancialProfile | null;
    personalSavingsPlan?: {
        consolidatedIncome: number;
        monthlySavingsPool: number;
        savingsPct: number;
        savingsPriorities: SavingsPriority[];
    } | null;
    summary?: {
        accounts: number;
        categories: number;
        budgetsMonth: number;
        transactions12m: number;
    };
    budgetUsed?: number;
    budgetTotal?: number;
    personalCycle?: {
        startDate: string | null;
        cycleDay: number;
        incomePaymentDays: number[];
        partnerIncomePaymentDays: number[];
        cardSchedules: Array<{
            name: string;
            paymentDay: number;
            strategy: "full" | "minimum" | "fixed";
            expectedPayment: number;
            currentBalance: number;
        }>;
        fixedPlanned: number;
        variablePlanned: number;
        fullCardPayments: number;
        revolvingMinimumPayments: number;
        operationalCommitment: number;
        plannedSavings: number;
        projectedFreeCash: number;
    };
    personal?: PersonalDashboardKPIs;
    business?: BusinessDashboardKPIs;
}

function resolveCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function computeMonthlyTrend(transactions: Transaction[]): MonthlyTrendPoint[] {
    const byMonth = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
        const month = t.date.slice(0, 7);
        const bucket = byMonth.get(month) || { income: 0, expenses: 0 };
        if (t.amount >= 0) {
            bucket.income += t.amount;
        } else {
            bucket.expenses += Math.abs(t.amount);
        }
        byMonth.set(month, bucket);
    }
    return Array.from(byMonth.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);
}

function resolveWindowStart(monthsBack: number) {
    const start = new Date();
    start.setMonth(start.getMonth() - monthsBack);
    return start.toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return 0;
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function clampDay(value: number | null | undefined, fallback: number) {
    if (value == null) return fallback;
    if (!Number.isFinite(value)) return fallback;
    return Math.min(31, Math.max(1, Math.round(value)));
}

function parseIsoDate(value: unknown) {
    if (typeof value !== "string") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
    return value.trim();
}

function extractOnboardingStartDate(rawAnswers: unknown) {
    if (!rawAnswers || typeof rawAnswers !== "object") return null;
    const answers = rawAnswers as Record<string, unknown>;
    return parseIsoDate(answers.startDate) ?? parseIsoDate(answers.start_date);
}

function normalizeCategoryLabel(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

const FIXED_BUDGET_KEYWORDS = [
    "vivienda",
    "housing",
    "rent",
    "alquiler",
    "hipoteca",
    "mortgage",
    "salud",
    "health",
    "insurance",
    "seguro",
    "utilities",
    "servicios",
    "internet",
    "telefono",
    "subscription",
    "suscripcion",
    "debt",
    "deuda",
    "loan",
    "prestamo",
];

function isLikelyFixedBudgetCategory(name: string) {
    const normalized = normalizeCategoryLabel(name);
    return FIXED_BUDGET_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function mapTransactions(raw: Array<Record<string, unknown>>): Transaction[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        date: String(item.date),
        description: String(item.description ?? ""),
        document_type: (item.document_type as Transaction["document_type"]) ?? null,
        document_number: (item.document_number as string) ?? null,
        account_id: String(item.account_id),
        category_gl_id: (item.category_gl_id as string) ?? null,
        counterparty_id: (item.counterparty_id as string) ?? null,
        cost_center_id: (item.cost_center_id as string) ?? null,
        project_id: (item.project_id as string) ?? null,
        amount: toNumber(item.amount),
        currency: String(item.currency ?? "USD"),
        tax_amount: item.tax_amount == null ? null : toNumber(item.tax_amount),
        is_transfer: Boolean(item.is_transfer),
        transfer_group_id: (item.transfer_group_id as string) ?? null,
        savings_goal_id: (item.savings_goal_id as string) ?? null,
        detraccion_rate: item.detraccion_rate == null ? null : toNumber(item.detraccion_rate),
        detraccion_amount: item.detraccion_amount == null ? null : toNumber(item.detraccion_amount),
        status: (item.status as string) ?? null,
        attachment_url: (item.attachment_url as string) ?? null,
        import_batch_id: (item.import_batch_id as string) ?? null,
        external_id: (item.external_id as string) ?? null,
        notes: (item.notes as string) ?? null,
        created_by: String(item.created_by),
        created_at: String(item.created_at ?? new Date().toISOString()),
        updated_at: String(item.updated_at ?? new Date().toISOString()),
    }));
}

function mapCategories(raw: Array<Record<string, unknown>>): CategoryGL[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        name: String(item.name),
        kind: item.kind as CategoryGL["kind"],
        fixed_cost: Boolean(item.fixed_cost),
        variable_cost: Boolean(item.variable_cost),
        is_active: Boolean(item.is_active ?? true),
        sort_order: Number(item.sort_order ?? 0),
        created_at: String(item.created_at ?? new Date().toISOString()),
    }));
}

function mapAccounts(raw: Array<Record<string, unknown>>): Account[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        name: String(item.name),
        account_type: item.account_type as Account["account_type"],
        currency: String(item.currency ?? "USD"),
        opening_balance: toNumber(item.opening_balance),
        credit_limit: item.credit_limit == null ? null : toNumber(item.credit_limit),
        interest_rate_apr: item.interest_rate_apr == null ? null : toNumber(item.interest_rate_apr),
        payment_day: item.payment_day == null ? null : toNumber(item.payment_day),
        card_payment_strategy:
            item.card_payment_strategy === "full" ||
                item.card_payment_strategy === "minimum" ||
                item.card_payment_strategy === "fixed"
                ? item.card_payment_strategy
                : null,
        minimum_payment_amount:
            item.minimum_payment_amount == null ? null : toNumber(item.minimum_payment_amount),
        is_restricted_cash: Boolean(item.is_restricted_cash),
        is_active: Boolean(item.is_active ?? true),
        created_at: String(item.created_at ?? new Date().toISOString()),
    }));
}

function mapBudgets(raw: Array<Record<string, unknown>>): Budget[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        month: String(item.month),
        category_gl_id: String(item.category_gl_id),
        cost_center_id: (item.cost_center_id as string) ?? null,
        amount: toNumber(item.amount),
        created_at: String(item.created_at ?? new Date().toISOString()),
    }));
}

const DEFAULT_SAVINGS_PRIORITIES: SavingsPriority[] = [
    "fixed_expenses",
    "debt_payments",
    "savings_goals",
];

function mapFinancialProfile(
    raw: Record<string, unknown> | null
): OrgFinancialProfile | null {
    if (!raw) return null;

    const prioritiesRaw = Array.isArray(raw.savings_priorities)
        ? raw.savings_priorities
        : [];
    const normalizedPriorities = prioritiesRaw
        .filter(
            (value): value is SavingsPriority =>
                value === "fixed_expenses" ||
                value === "debt_payments" ||
                value === "savings_goals"
        )
        .slice(0, 3);
    for (const priority of DEFAULT_SAVINGS_PRIORITIES) {
        if (!normalizedPriorities.includes(priority)) {
            normalizedPriorities.push(priority);
        }
    }

    return {
        org_id: String(raw.org_id),
        monthly_income_net: toNumber(raw.monthly_income_net),
        additional_income: toNumber(raw.additional_income),
        partner_contribution: toNumber(raw.partner_contribution),
        consolidated_income: toNumber(raw.consolidated_income),
        salary_frequency:
            raw.salary_frequency === "monthly" || raw.salary_frequency === "biweekly"
                ? raw.salary_frequency
                : undefined,
        salary_payment_day_1:
            raw.salary_payment_day_1 == null ? undefined : toNumber(raw.salary_payment_day_1),
        salary_payment_day_2:
            raw.salary_payment_day_2 == null ? undefined : toNumber(raw.salary_payment_day_2),
        first_fortnight_amount:
            raw.first_fortnight_amount == null ? undefined : toNumber(raw.first_fortnight_amount),
        second_fortnight_amount:
            raw.second_fortnight_amount == null ? undefined : toNumber(raw.second_fortnight_amount),
        partner_salary_frequency:
            raw.partner_salary_frequency === "monthly" || raw.partner_salary_frequency === "biweekly"
                ? raw.partner_salary_frequency
                : undefined,
        partner_salary_payment_day_1:
            raw.partner_salary_payment_day_1 == null
                ? undefined
                : toNumber(raw.partner_salary_payment_day_1),
        partner_salary_payment_day_2:
            raw.partner_salary_payment_day_2 == null
                ? undefined
                : toNumber(raw.partner_salary_payment_day_2),
        partner_first_fortnight_amount:
            raw.partner_first_fortnight_amount == null
                ? undefined
                : toNumber(raw.partner_first_fortnight_amount),
        partner_second_fortnight_amount:
            raw.partner_second_fortnight_amount == null
                ? undefined
                : toNumber(raw.partner_second_fortnight_amount),
        distribution_rule: (raw.distribution_rule as OrgFinancialProfile["distribution_rule"]) ?? "50_30_20",
        needs_pct: toNumber(raw.needs_pct),
        wants_pct: toNumber(raw.wants_pct),
        savings_pct: toNumber(raw.savings_pct),
        debt_pct: toNumber(raw.debt_pct),
        savings_priorities: normalizedPriorities,
        created_at: String(raw.created_at ?? new Date().toISOString()),
        updated_at: String(raw.updated_at ?? new Date().toISOString()),
    };
}

function isMissingTableError(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const value = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof value.code === "string" ? value.code : "";
    const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
    const details = typeof value.details === "string" ? value.details.toLowerCase() : "";
    return code === "42P01" || message.includes("does not exist") || details.includes("does not exist");
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
    const context = await getOrgContextOrNull();
    if (!context) {
        return {
            orgType: "personal",
            currency: "USD",
            locale: "es",
            monthlyTrend: [],
            personal: {
                netCashFlow: 0,
                savingsRatePct: 0,
                assets: 0,
                liabilities: 0,
                netWorth: 0,
                emergencyFundMonths: 0,
                avgMonthlyExpenses: 0,
                expenseMonthsObserved: 0,
                liquidCash: 0,
                budgetVariance: 0,
            },
        };
    }

    const { supabase, orgId } = context;
    const month = resolveCurrentMonth();
    const fromDate = resolveWindowStart(12);

    const [
        orgResult,
        accountsResult,
        categoriesResult,
        budgetsResult,
        transactionsResult,
        forecastResult,
        savingsGoalsResult,
        financialProfileResult,
        onboardingStateResult,
    ] = await Promise.all([
        supabase
            .from("orgs")
            .select("type, currency, preferred_locale")
            .eq("id", orgId)
            .maybeSingle(),
        supabase.from("accounts").select("*").eq("org_id", orgId),
        supabase.from("categories_gl").select("*").eq("org_id", orgId).eq("is_active", true),
        supabase.from("budgets").select("*").eq("org_id", orgId).eq("month", month),
        supabase
            .from("transactions")
            .select("*")
            .eq("org_id", orgId)
            .gte("date", fromDate),
        supabase
            .from("forecast_assumptions")
            .select("*")
            .eq("org_id", orgId)
            .eq("month", month)
            .maybeSingle(),
        supabase.from("savings_goals").select("*").eq("org_id", orgId),
        supabase.from("org_financial_profile").select("*").eq("org_id", orgId).maybeSingle(),
        supabase
            .from("onboarding_state")
            .select("answers, completed_at, created_at")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    if (orgResult.error || !orgResult.data) {
        logError("Error fetching org data for dashboard", orgResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (accountsResult.error) {
        logError("Error fetching accounts for dashboard", accountsResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (categoriesResult.error) {
        logError("Error fetching categories for dashboard", categoriesResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (budgetsResult.error) {
        logError("Error fetching budgets for dashboard", budgetsResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (transactionsResult.error) {
        logError("Error fetching transactions for dashboard", transactionsResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (forecastResult.error) {
        logError("Error fetching forecast assumptions for dashboard", forecastResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (savingsGoalsResult.error) {
        logError("Error fetching savings goals", savingsGoalsResult.error, { orgId });
        // Don't throw for savings goals specifically to avoid breaking the whole dashboard
    }
    if (financialProfileResult.error && !isMissingTableError(financialProfileResult.error)) {
        logError("Error fetching org financial profile", financialProfileResult.error, { orgId });
    }
    if (onboardingStateResult.error) {
        logError("Error fetching onboarding state", onboardingStateResult.error, { orgId });
    }

    const accounts = mapAccounts((accountsResult.data || []) as Array<Record<string, unknown>>);
    const categories = mapCategories((categoriesResult.data || []) as Array<Record<string, unknown>>);
    const budgets = mapBudgets((budgetsResult.data || []) as Array<Record<string, unknown>>);
    const transactions = mapTransactions((transactionsResult.data || []) as Array<Record<string, unknown>>);
    const savingsGoals = (savingsGoalsResult.data || []) as SavingsGoal[];
    const financialProfile = mapFinancialProfile(
        (financialProfileResult.data || null) as Record<string, unknown> | null
    );
    const personalSavingsPlan = financialProfile
        ? {
            consolidatedIncome: financialProfile.consolidated_income,
            monthlySavingsPool:
                (financialProfile.consolidated_income * financialProfile.savings_pct) / 100,
            savingsPct: financialProfile.savings_pct,
            savingsPriorities: financialProfile.savings_priorities,
        }
        : null;
    const onboardingStartDate = extractOnboardingStartDate(
        (onboardingStateResult.data?.answers as Record<string, unknown> | undefined) ?? null
    );
    const summary = {
        accounts: accounts.length,
        categories: categories.length,
        budgetsMonth: budgets.length,
        transactions12m: transactions.length,
    };

    const orgType = orgResult.data.type;
    const currency = orgResult.data.currency || "USD";
    const locale = orgResult.data.preferred_locale === "en" ? "en" : "es";

    const budgetByCategory = budgets.map((budget) => ({
        amount: Number(budget.amount || 0),
        category:
            categories.find((category) => category.id === budget.category_gl_id) || null,
    }));
    const fixedPlanned = round2(
        budgetByCategory.reduce((sum, row) => {
            if (!row.category) return sum;
            if (orgType === "business") {
                return row.category.fixed_cost ? sum + row.amount : sum;
            }
            return isLikelyFixedBudgetCategory(row.category.name) ? sum + row.amount : sum;
        }, 0)
    );
    const variablePlanned = round2(
        budgetByCategory.reduce((sum, row) => {
            if (!row.category) return sum + row.amount;
            if (orgType === "business") {
                if (row.category.fixed_cost) return sum;
                return sum + row.amount;
            }
            return isLikelyFixedBudgetCategory(row.category.name) ? sum : sum + row.amount;
        }, 0)
    );

    const creditCardSchedules = accounts
        .filter((account) => account.account_type === "credit_card")
        .map((account) => {
            const strategy =
                account.card_payment_strategy ||
                (Number(account.minimum_payment_amount || 0) > 0 ? "minimum" : "full");
            const currentBalance = round2(Math.abs(Number(account.opening_balance || 0)));
            const expectedPayment =
                strategy === "full"
                    ? currentBalance
                    : round2(
                        Number(account.minimum_payment_amount || 0) > 0
                            ? Number(account.minimum_payment_amount || 0)
                            : currentBalance * 0.05
                    );

            return {
                name: account.name,
                paymentDay: clampDay(account.payment_day ?? null, 30),
                strategy,
                currentBalance,
                expectedPayment,
            };
        });

    const fullCardPayments = round2(
        creditCardSchedules
            .filter((card) => card.strategy === "full")
            .reduce((sum, card) => sum + card.expectedPayment, 0)
    );
    const revolvingMinimumPayments = round2(
        creditCardSchedules
            .filter((card) => card.strategy !== "full")
            .reduce((sum, card) => sum + card.expectedPayment, 0)
    );
    const operationalCommitment = round2(
        fixedPlanned + variablePlanned + fullCardPayments + revolvingMinimumPayments
    );
    const plannedSavings = round2(personalSavingsPlan?.monthlySavingsPool ?? 0);
    const projectedFreeCash = round2(
        Math.max((personalSavingsPlan?.consolidatedIncome ?? 0) - operationalCommitment - plannedSavings, 0)
    );

    const incomePaymentDays =
        financialProfile?.salary_frequency === "biweekly"
            ? [
                clampDay(financialProfile.salary_payment_day_2, 15),
                clampDay(financialProfile.salary_payment_day_1, 30),
            ]
            : [clampDay(financialProfile?.salary_payment_day_1, 30)];
    const partnerIncomePaymentDays =
        (financialProfile?.partner_contribution || 0) > 0
            ? financialProfile?.partner_salary_frequency === "biweekly"
                ? [
                    clampDay(financialProfile.partner_salary_payment_day_2, 15),
                    clampDay(financialProfile.partner_salary_payment_day_1, 30),
                ]
                : [clampDay(financialProfile?.partner_salary_payment_day_1, 30)]
            : [];

    const cycleDay = clampDay(
        onboardingStartDate
            ? Number.parseInt(onboardingStartDate.slice(-2), 10)
            : null,
        1
    );

    const monthlyTrend = computeMonthlyTrend(transactions);
    const budgetTotalAmount = round2(budgetByCategory.reduce((s, r) => s + r.amount, 0));

    if (orgType === "business") {
        const business = calculateBusinessKPIs(transactions, categories, budgets, month);
        const budgetVariance = business.budgetVsActual.reduce((sum, item) => sum + item.variance, 0);
        const restrictedCash = accounts
            .filter((account) => account.is_restricted_cash)
            .reduce((sum, account) => sum + Number(account.opening_balance || 0), 0);

        const businessForecast = computeBusinessForecast({
            targetMonth: month,
            horizonMonths: 3,
            categories,
            transactions,
            assumptions: {
                revenue_growth_rate: forecastResult.data?.revenue_growth_rate ?? null,
                revenue_amount: forecastResult.data?.revenue_amount ?? null,
                cogs_percent: forecastResult.data?.cogs_percent ?? null,
                fixed_opex: forecastResult.data?.fixed_opex ?? null,
                variable_opex_percent: forecastResult.data?.variable_opex_percent ?? null,
                one_off_amount: forecastResult.data?.one_off_amount ?? null,
            },
        });
        const firstProjection = businessForecast.projections[0];
        const budgetUsedBiz = round2(business.budgetVsActual.reduce((s, i) => s + i.actual, 0));

        return {
            orgType,
            currency,
            locale,
            monthlyTrend,
            savingsGoals,
            financialProfile,
            personalSavingsPlan,
            summary,
            budgetUsed: budgetUsedBiz,
            budgetTotal: budgetTotalAmount,
            business: {
                revenue: business.revenue,
                cogs: business.cogs,
                opex: business.opex,
                operatingIncome: business.operatingIncome,
                operatingMarginPct: business.operatingMargin * 100,
                budgetVariance,
                forecastRevenue: firstProjection?.revenue ?? 0,
                forecastEbit: firstProjection?.ebit ?? 0,
                restrictedCash,
            },
        };
    }

    const personal = calculatePersonalKPIs(transactions, categories, accounts, budgets, month);
    const budgetVariance = personal.budgetUtilization.reduce((sum, item) => sum + item.variance, 0);

    const budgetUsedPersonal = round2(personal.budgetUtilization.reduce((s, i) => s + i.actual, 0));

    return {
        orgType,
        currency,
        locale,
        monthlyTrend,
        savingsGoals,
        financialProfile,
        personalSavingsPlan,
        summary,
        budgetUsed: budgetUsedPersonal,
        budgetTotal: budgetTotalAmount,
        personalCycle: {
            startDate: onboardingStartDate,
            cycleDay,
            incomePaymentDays,
            partnerIncomePaymentDays,
            cardSchedules: creditCardSchedules,
            fixedPlanned,
            variablePlanned,
            fullCardPayments,
            revolvingMinimumPayments,
            operationalCommitment,
            plannedSavings,
            projectedFreeCash,
        },
        personal: {
            netCashFlow: personal.netCashFlow,
            savingsRatePct: personal.savingsRate * 100,
            assets: personal.assets,
            liabilities: personal.liabilities,
            netWorth: personal.netWorth,
            emergencyFundMonths: personal.emergencyFundMonths,
            avgMonthlyExpenses: personal.avgMonthlyExpenses,
            expenseMonthsObserved: personal.expenseMonthsObserved,
            liquidCash: personal.liquidCash,
            budgetVariance,
        },
    };
}

export async function getRecentTransactions() {
    const context = await getOrgContextOrNull();
    if (!context) return [];
    const { supabase, orgId } = context;

    const { data, error } = await supabase
        .from("transactions")
        .select("*, accounts(name), categories_gl(name)")
        .eq("org_id", orgId)
        .order("date", { ascending: false })
        .limit(6);
    if (error) {
        logError("Error fetching recent transactions", error, { orgId });
        return [];
    }

    return data || [];
}
export async function hasAnyTransaction() {
    const { supabase, orgId } = await requireOrgContext();

    const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

    if (error) {
        logError("Error checking transactions", error, { orgId });
        return false;
    }

    return (count || 0) > 0;
}

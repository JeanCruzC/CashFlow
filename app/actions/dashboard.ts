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

export interface DashboardKPIs {
    orgType: "personal" | "business";
    currency: string;
    locale: "es" | "en";
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
    personal?: PersonalDashboardKPIs;
    business?: BusinessDashboardKPIs;
}

function resolveCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
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
            personal: {
                netCashFlow: 0,
                savingsRatePct: 0,
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
    const summary = {
        accounts: accounts.length,
        categories: categories.length,
        budgetsMonth: budgets.length,
        transactions12m: transactions.length,
    };

    const orgType = orgResult.data.type;
    const currency = orgResult.data.currency || "USD";
    const locale = orgResult.data.preferred_locale === "en" ? "en" : "es";

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

        return {
            orgType,
            currency,
            locale,
            savingsGoals,
            financialProfile,
            personalSavingsPlan,
            summary,
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

    return {
        orgType,
        currency,
        locale,
        savingsGoals,
        financialProfile,
        personalSavingsPlan,
        summary,
        personal: {
            netCashFlow: personal.netCashFlow,
            savingsRatePct: personal.savingsRate * 100,
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

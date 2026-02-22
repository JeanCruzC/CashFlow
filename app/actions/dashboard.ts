"use server";

import { getOrgContextOrNull } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";
import { calculateBusinessKPIs, calculatePersonalKPIs } from "@/lib/utils/kpi";
import { Account, Budget, CategoryGL, Transaction } from "@/lib/types/finance";
import { computeBusinessForecast } from "@/lib/server/forecast-engine";

export interface PersonalDashboardKPIs {
    netCashFlow: number;
    savingsRatePct: number;
    netWorth: number;
    emergencyFundMonths: number;
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

    const accounts = mapAccounts((accountsResult.data || []) as Array<Record<string, unknown>>);
    const categories = mapCategories((categoriesResult.data || []) as Array<Record<string, unknown>>);
    const budgets = mapBudgets((budgetsResult.data || []) as Array<Record<string, unknown>>);
    const transactions = mapTransactions((transactionsResult.data || []) as Array<Record<string, unknown>>);

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
        personal: {
            netCashFlow: personal.netCashFlow,
            savingsRatePct: personal.savingsRate * 100,
            netWorth: personal.netWorth,
            emergencyFundMonths: personal.emergencyFundMonths,
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

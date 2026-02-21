import { requireUserContext } from "@/lib/server/context";
import { AccountType, CategoryKind, OrgType } from "@/lib/types/finance";
import { logError } from "@/lib/server/logger";
import { z } from "zod";

function defaultOrgName(profileType: OrgType) {
    return profileType === "personal" ? "Mis Finanzas" : "Mi Negocio";
}

const accountTypeSchema = z.enum(["cash", "bank", "credit_card", "loan", "investment"]);
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

function normalizeCurrency(value: string | undefined): string | undefined {
    if (!value) return undefined;
    return value.trim().toUpperCase();
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

    if (setup.firstAccount) {
        accounts.push({
            name: setup.firstAccount.name,
            account_type: setup.firstAccount.accountType,
            opening_balance: setup.firstAccount.openingBalance,
            currency: normalizeCurrency(setup.firstAccount.currency) || normalizeCurrency(setup.currency) || "USD",
        });
        return accounts;
    }

    const baseCurrency = normalizeCurrency(setup.currency) || "USD";
    if (profileType === "personal") {
        accounts.push({
            name: "Cuenta principal",
            account_type: "bank",
            opening_balance: 0,
            currency: baseCurrency,
        });
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
            step: profileType === "business" ? 6 : 5,
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

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrgContextOrNull, requireOrgActorContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

const orgSettingsSchema = z.object({
    name: z.string().min(2, "Nombre requerido"),
    country: z.string().min(2, "País requerido"),
    currency: z.string().length(3, "Moneda inválida"),
    timezone: z.string().min(1, "Zona horaria requerida"),
    preferred_locale: z.enum(["es", "en"]),
    accounting_basis: z.enum(["cash_basis", "accrual_basis"]).nullable(),
    detracciones_enabled: z.boolean(),
});

export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;

export interface OrgSettingsData extends OrgSettingsInput {
    id: string;
    type: "personal" | "business";
}

const financialProfileSchema = z.object({
    monthly_income_net: z.number().finite().min(0, "Monto inválido"),
    additional_income: z.number().finite().min(0).optional(),
    partner_contribution: z.number().finite().min(0).optional(),
    salary_frequency: z.enum(["monthly", "biweekly"]).optional(),
    salary_payment_day_1: z.number().int().min(1).max(31).optional(),
    salary_payment_day_2: z.number().int().min(1).max(31).optional(),
    first_fortnight_amount: z.number().finite().min(0).optional(),
    second_fortnight_amount: z.number().finite().min(0).optional(),
    partner_salary_frequency: z.enum(["monthly", "biweekly"]).optional(),
    partner_salary_payment_day_1: z.number().int().min(1).max(31).optional(),
    partner_salary_payment_day_2: z.number().int().min(1).max(31).optional(),
    partner_first_fortnight_amount: z.number().finite().min(0).optional(),
    partner_second_fortnight_amount: z.number().finite().min(0).optional(),
    distribution_rule: z.enum(["50_30_20", "70_20_10", "80_20", "custom"]),
    needs_pct: z.number().finite().min(0).max(100),
    wants_pct: z.number().finite().min(0).max(100),
    savings_pct: z.number().finite().min(0).max(100),
    debt_pct: z.number().finite().min(0).max(100),
    savings_priorities: z.array(z.enum(["fixed_expenses", "debt_payments", "savings_goals"])).min(1).max(3),
});

export type FinancialProfileInput = z.infer<typeof financialProfileSchema>;

export async function getOrgSettings(): Promise<OrgSettingsData | null> {
    const context = await getOrgContextOrNull();
    if (!context) return null;

    const { supabase, orgId } = context;
    const { data, error } = await supabase
        .from("orgs")
        .select("id, type, name, country, currency, timezone, preferred_locale, accounting_basis, detracciones_enabled")
        .eq("id", orgId)
        .maybeSingle();

    if (error) {
        logError("Error fetching organization settings", error, { orgId });
        throw new Error("No se pudo cargar la configuración");
    }

    if (!data) return null;

    return {
        id: data.id,
        type: data.type,
        name: data.name,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        preferred_locale: data.preferred_locale === "en" ? "en" : "es",
        accounting_basis:
            data.accounting_basis === "accrual_basis" || data.accounting_basis === "cash_basis"
                ? data.accounting_basis
                : null,
        detracciones_enabled: Boolean(data.detracciones_enabled),
    };
}

export async function updateOrgSettings(input: OrgSettingsInput) {
    const validation = orgSettingsSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `update-org-settings:${user.id}`,
            limit: 20,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { error } = await supabase
        .from("orgs")
        .update(validation.data)
        .eq("id", orgId);

    if (error) {
        logError("Error updating organization settings", error, { orgId, userId: user.id });
        return { error: "No se pudo guardar la configuración" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function getFinancialProfile(): Promise<FinancialProfileInput | null> {
    const context = await getOrgContextOrNull();
    if (!context) return null;

    const { supabase, orgId } = context;

    const { data, error } = await supabase
        .from("org_financial_profile")
        .select(`
            monthly_income_net, additional_income, partner_contribution,
            salary_frequency, salary_payment_day_1, salary_payment_day_2,
            first_fortnight_amount, second_fortnight_amount,
            partner_salary_frequency, partner_salary_payment_day_1, partner_salary_payment_day_2,
            partner_first_fortnight_amount, partner_second_fortnight_amount,
            distribution_rule, needs_pct, wants_pct, savings_pct, debt_pct,
            savings_priorities
        `)
        .eq("org_id", orgId)
        .maybeSingle();

    if (error) {
        logError("Error fetching financial profile", error, { orgId });
        return null;
    }

    if (!data) return null;

    return data as FinancialProfileInput;
}

export async function updateFinancialProfile(input: FinancialProfileInput) {
    const validation = financialProfileSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `update-financial-profile:${user.id}`,
            limit: 20,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { error } = await supabase
        .from("org_financial_profile")
        .update(validation.data)
        .eq("org_id", orgId);

    if (error) {
        logError("Error updating financial profile", error, { orgId, userId: user.id });
        return { error: "No se pudo guardar el perfil financiero" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    revalidatePath("/onboarding/select-profile");
    return { success: true };
}

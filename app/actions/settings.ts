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

// ----------------------------------------------------------------------
// Credit Cards (Stored as accounts with account_type='credit_card')
// ----------------------------------------------------------------------

const creditCardSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nombre requerido"),
    currency: z.string().length(3).default("PEN"),
    credit_limit: z.number().finite().positive("Límite debe ser mayor a 0"),
    current_balance: z.number().finite().min(0, "Deuda (balance) debe ser positivo o 0"), // UI shows positive, DB stores as negative opening_balance
    payment_day: z.number().int().min(1).max(31),
    card_payment_strategy: z.enum(["full", "minimum", "fixed"]),
    minimum_payment_amount: z.number().finite().min(0).default(0),
    tea: z.number().finite().min(0).default(0),
    has_desgravamen: z.boolean().default(false),
    desgravamen_amount: z.number().finite().min(0).default(0),
});

export type CreditCardInput = z.infer<typeof creditCardSchema>;

export async function getCreditCards() {
    const context = await getOrgContextOrNull();
    if (!context) return { data: null, error: "No context" };

    const { supabase, orgId } = context;
    const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("org_id", orgId)
        .eq("account_type", "credit_card")
        .order("name");

    if (error) return { error: error.message };

    // Map negative opening_balance back to positive current_balance for UI
    const mapped = (data || []).map(row => ({
        ...row,
        current_balance: Math.abs(Number(row.opening_balance || 0)),
    }));

    return { data: mapped };
}

export async function upsertCreditCard(input: CreditCardInput) {
    const validation = creditCardSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();
    const validData = validation.data;

    const row = {
        org_id: orgId,
        name: validData.name,
        account_type: "credit_card",
        currency: validData.currency,
        opening_balance: -Math.abs(validData.current_balance),
        credit_limit: validData.credit_limit,
        payment_day: validData.payment_day,
        card_payment_strategy: validData.card_payment_strategy,
        minimum_payment_amount: validData.minimum_payment_amount,
        tea: validData.tea,
        has_desgravamen: validData.has_desgravamen,
        desgravamen_amount: validData.desgravamen_amount,
        is_restricted_cash: false,
    };

    let error;
    if (validData.id) {
        const { error: updateError } = await supabase
            .from("accounts")
            .update(row)
            .eq("id", validData.id)
            .eq("org_id", orgId);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from("accounts")
            .insert(row);
        error = insertError;
    }

    if (error) {
        logError("Error upserting credit card", error, { orgId, userId: user.id });
        return { error: "No se pudo guardar la tarjeta" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteCreditCard(id: string) {
    const { supabase, orgId, user } = await requireOrgActorContext();
    const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);

    if (error) {
        logError("Error deleting credit card", error, { orgId, userId: user.id });
        return { error: "No se pudo eliminar la tarjeta" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
}

// ----------------------------------------------------------------------
// Subscriptions (Stored in onboarding_state JSON)
// ----------------------------------------------------------------------

const subscriptionSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nombre requerido"),
    monthlyCost: z.number().finite().positive("Costo debe ser positivo"),
    billingDay: z.number().int().min(1).max(31),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export async function getSubscriptions() {
    const context = await getOrgContextOrNull();
    if (!context) return { data: null, error: "No context" };

    const { supabase, orgId } = context;
    const { data, error } = await supabase
        .from("onboarding_state")
        .select("answers")
        .eq("org_id", orgId)
        .maybeSingle();

    if (error) return { error: error.message };
    if (!data?.answers || typeof data.answers !== "object") return { data: [] };

    const answers = data.answers as Record<string, unknown>;
    const subs = Array.isArray(answers.subscriptions) ? answers.subscriptions : [];

    return { data: subs };
}

export async function upsertSubscription(input: SubscriptionInput) {
    const validation = subscriptionSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();
    const validData = validation.data;

    // Get current answers
    const { data, error: fetchError } = await supabase
        .from("onboarding_state")
        .select("answers, user_id")
        .eq("org_id", orgId)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

    if (fetchError || !data) {
        return { error: "No se pudo cargar el perfil de onboarding para suscribir" };
    }

    const answers = (data.answers as Record<string, unknown>) || {};
    let subs = Array.isArray(answers.subscriptions) ? [...answers.subscriptions] : [];

    if (validData.id) {
        // Update
        subs = subs.map(sub => sub.id === validData.id ? { ...validData } : sub);
    } else {
        // Insert
        subs.push({ ...validData, id: crypto.randomUUID() });
    }

    answers.subscriptions = subs;

    const { error: updateError } = await supabase
        .from("onboarding_state")
        .update({ answers })
        .eq("org_id", orgId)
        .eq("user_id", data.user_id);

    if (updateError) {
        logError("Error upserting subscription", updateError, { orgId, userId: user.id });
        return { error: "No se pudo guardar la suscripción" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteSubscription(id: string) {
    const { supabase, orgId, user } = await requireOrgActorContext();

    const { data, error: fetchError } = await supabase
        .from("onboarding_state")
        .select("answers, user_id")
        .eq("org_id", orgId)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

    if (fetchError || !data) return { error: "No se encontró el perfil" };

    const answers = (data.answers as Record<string, unknown>) || {};
    const subs = Array.isArray(answers.subscriptions) ? answers.subscriptions : [];

    answers.subscriptions = subs.filter(sub => sub.id !== id);

    const { error: updateError } = await supabase
        .from("onboarding_state")
        .update({ answers })
        .eq("org_id", orgId)
        .eq("user_id", data.user_id);

    if (updateError) {
        logError("Error deleting subscription", updateError, { orgId, userId: user.id });
        return { error: "No se pudo eliminar la suscripción" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
}

// ----------------------------------------------------------------------
// Savings Goals
// ----------------------------------------------------------------------

const savingsGoalSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nombre requerido"),
    target_amount: z.number().finite().positive("El objetivo debe ser mayor a 0"),
    deadline_date: z.string().nullable().optional(),
    goal_weight: z.number().finite().positive().default(1),
});

export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

export async function getSavingsGoals() {
    const context = await getOrgContextOrNull();
    if (!context) return { data: null, error: "No context" };

    const { supabase, orgId } = context;
    const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });

    if (error) return { error: error.message };
    return { data };
}

export async function upsertSavingsGoal(input: SavingsGoalInput) {
    const validation = savingsGoalSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();
    const validData = validation.data;

    const row = {
        org_id: orgId,
        name: validData.name,
        target_amount: validData.target_amount,
        deadline_date: validData.deadline_date || null,
        goal_weight: validData.goal_weight,
    };

    let error;
    if (validData.id) {
        const { error: updateError } = await supabase
            .from("savings_goals")
            .update(row)
            .eq("id", validData.id)
            .eq("org_id", orgId);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from("savings_goals")
            .insert({
                ...row,
                current_amount: 0,
                monthly_contribution: 0, // Recalculated periodically or via trigger
            });
        error = insertError;
    }

    if (error) {
        logError("Error upserting savings goal", error, { orgId, userId: user.id });
        return { error: "No se pudo guardar la meta de ahorro" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteSavingsGoal(id: string) {
    const { supabase, orgId, user } = await requireOrgActorContext();
    const { error } = await supabase
        .from("savings_goals")
        .delete()
        .eq("id", id)
        .eq("org_id", orgId);

    if (error) {
        logError("Error deleting savings goal", error, { orgId, userId: user.id });
        return { error: "No se pudo eliminar la meta de ahorro" };
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
}


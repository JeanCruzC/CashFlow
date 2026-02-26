"use server";

import { accountSchema, AccountInput } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { requireOrgActorContext, requireOrgContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

function isMissingTableError(error: unknown) {
    if (!error || typeof error !== "object") return false;
    const value = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof value.code === "string" ? value.code : "";
    const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
    const details = typeof value.details === "string" ? value.details.toLowerCase() : "";
    return code === "42P01" || message.includes("does not exist") || details.includes("does not exist");
}

export async function getAccounts() {
    const { supabase, orgId } = await requireOrgContext();

    const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("org_id", orgId)
        .order("name");

    if (error) {
        logError("Error fetching accounts", error, { orgId });
        throw new Error("No se pudieron cargar las cuentas");
    }
    return data;
}

export async function createAccount(input: AccountInput) {
    const validation = accountSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `create-account:${user.id}`,
            limit: 20,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { error } = await supabase.from("accounts").insert({
        ...validation.data,
        org_id: orgId,
    });

    if (error) {
        logError("Error creating account", error, { orgId, userId: user.id });
        return { error: error.message };
    }

    revalidatePath("/dashboard/accounts");
    return { success: true };
}

export async function getAccountBalances(): Promise<Record<string, number>> {
    const { supabase, orgId } = await requireOrgContext();

    const { data, error } = await supabase
        .from("transactions")
        .select("account_id, amount")
        .eq("org_id", orgId);

    if (error) {
        logError("Error fetching transaction sums for account balances", error, { orgId });
        return {};
    }

    const balanceMap: Record<string, number> = {};
    for (const row of (data || [])) {
        const accountId = row.account_id as string;
        const amount = Number(row.amount) || 0;
        balanceMap[accountId] = (balanceMap[accountId] || 0) + amount;
    }

    return balanceMap;
}

export async function getPartnerContribution(): Promise<number> {
    const { supabase, orgId } = await requireOrgContext();

    const { data, error } = await supabase
        .from("org_financial_profile")
        .select("partner_contribution")
        .eq("org_id", orgId)
        .maybeSingle();

    if (error) {
        if (!isMissingTableError(error)) {
            logError("Error fetching partner contribution", error, { orgId });
        }
        return 0;
    }

    return Math.max(Number(data?.partner_contribution || 0), 0);
}

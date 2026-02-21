"use server";

import { accountSchema, AccountInput } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { requireOrgActorContext, requireOrgContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

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

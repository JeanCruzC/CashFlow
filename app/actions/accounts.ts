"use server";

import { accountSchema, AccountInput } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/server/context";

export async function getAccounts() {
    const { supabase, orgId } = await requireOrgContext();

    const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("org_id", orgId)
        .order("name");

    if (error) throw error;
    return data;
}

export async function createAccount(input: AccountInput) {
    const validation = accountSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId } = await requireOrgContext();

    const { error } = await supabase.from("accounts").insert({
        ...validation.data,
        org_id: orgId,
    });

    if (error) return { error: error.message };

    revalidatePath("/dashboard/accounts");
    return { success: true };
}

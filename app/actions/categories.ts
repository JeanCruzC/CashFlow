"use server";

import { categorySchema, CategoryInput } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

export async function getCategories() {
    const { supabase, orgId } = await requireOrgContext();

    const { data, error } = await supabase
        .from("categories_gl")
        .select("*")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("name");

    if (error) throw error;
    return data;
}

export async function createCategory(input: CategoryInput) {
    const validation = categorySchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgContext();

    try {
        assertRateLimit({
            key: `create-category:${user.id}`,
            limit: 30,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { error } = await supabase.from("categories_gl").insert({
        org_id: orgId,
        ...validation.data,
    });

    if (error) {
        logError("Error creating category", error, { orgId, userId: user.id });
        return { error: error.message };
    }

    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/transactions/new");
    return { success: true };
}

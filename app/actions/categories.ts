"use server";

import { requireOrgContext } from "@/lib/server/context";

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

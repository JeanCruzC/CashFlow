"use server";

import { requireOrgContext } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";

export async function getSavingsGoals() {
    const { supabase, orgId } = await requireOrgContext();

    const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });

    if (error) {
        logError("Error fetching savings goals", error, { orgId });
        throw new Error("No se pudieron cargar las metas de ahorro");
    }

    return data;
}

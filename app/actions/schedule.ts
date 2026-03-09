"use server";

import { requireOrgContext } from "@/lib/server/context";
import { revalidatePath } from "next/cache";

/**
 * Dismisses a schedule event for the current cycle.
 * When a user clicks "No llegó" on an overdue event, this marks it
 * as acknowledged so it stops showing as overdue and the system
 * treats it as rescheduled to the next cycle.
 */
export async function dismissScheduleEvent(eventKey: string) {
    const context = await requireOrgContext();
    const { supabase, orgId } = context;
    const now = new Date();
    const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    await supabase.from("dismissed_schedule_events").upsert(
        {
            org_id: orgId,
            user_id: user.id,
            event_key: eventKey,
            cycle_month: cycleMonth,
        },
        { onConflict: "org_id,event_key,cycle_month" }
    );

    revalidatePath("/dashboard");
}

/**
 * Returns the set of dismissed event keys for the current cycle.
 */
export async function getDismissedScheduleEvents(): Promise<Set<string>> {
    const context = await requireOrgContext();
    const { supabase, orgId } = context;
    const now = new Date();
    const cycleMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data } = await supabase
        .from("dismissed_schedule_events")
        .select("event_key")
        .eq("org_id", orgId)
        .eq("cycle_month", cycleMonth);

    return new Set((data || []).map((row) => row.event_key));
}

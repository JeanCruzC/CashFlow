"use server";

import { revalidatePath } from "next/cache";
import { forecastSchema, ForecastInput } from "@/lib/validations/schemas";
import { getOrgContextOrNull, requireOrgActorContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

function resolveMonth(month?: string) {
    if (month && /^\d{4}-\d{2}$/.test(month)) return month;
    return new Date().toISOString().slice(0, 7);
}

export interface ForecastOverview {
    month: string;
    revenue_growth_rate: number | null;
    revenue_amount: number | null;
    cogs_percent: number | null;
    fixed_opex: number | null;
    variable_opex_percent: number | null;
    one_off_amount: number | null;
    note: string | null;
}

export async function getForecastOverview(month?: string): Promise<ForecastOverview> {
    const targetMonth = resolveMonth(month);
    const context = await getOrgContextOrNull();
    if (!context) {
        return {
            month: targetMonth,
            revenue_growth_rate: null,
            revenue_amount: null,
            cogs_percent: null,
            fixed_opex: null,
            variable_opex_percent: null,
            one_off_amount: null,
            note: null,
        };
    }

    const { supabase, orgId } = context;
    const { data, error } = await supabase
        .from("forecast_assumptions")
        .select("*")
        .eq("org_id", orgId)
        .eq("month", targetMonth)
        .maybeSingle();

    if (error) {
        logError("Error fetching forecast assumptions", error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el pronóstico");
    }

    return {
        month: targetMonth,
        revenue_growth_rate: data?.revenue_growth_rate ?? null,
        revenue_amount: data?.revenue_amount ?? null,
        cogs_percent: data?.cogs_percent ?? null,
        fixed_opex: data?.fixed_opex ?? null,
        variable_opex_percent: data?.variable_opex_percent ?? null,
        one_off_amount: data?.one_off_amount ?? null,
        note: data?.note ?? null,
    };
}

export async function upsertForecastAssumption(input: ForecastInput) {
    const validation = forecastSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `upsert-forecast:${user.id}`,
            limit: 30,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const payload = validation.data;
    const { error } = await supabase
        .from("forecast_assumptions")
        .upsert(
            {
                org_id: orgId,
                month: payload.month,
                revenue_growth_rate: payload.revenue_growth_rate ?? null,
                revenue_amount: payload.revenue_amount ?? null,
                cogs_percent: payload.cogs_percent ?? null,
                fixed_opex: payload.fixed_opex ?? null,
                variable_opex_percent: payload.variable_opex_percent ?? null,
                one_off_amount: payload.one_off_amount ?? null,
                note: payload.note ?? null,
            },
            { onConflict: "org_id,month" }
        );

    if (error) {
        logError("Error upserting forecast assumptions", error, { orgId, userId: user.id, month: payload.month });
        return { error: "No se pudo guardar el pronóstico" };
    }

    revalidatePath("/dashboard/forecast");
    revalidatePath("/dashboard");
    return { success: true };
}

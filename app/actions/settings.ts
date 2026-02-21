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

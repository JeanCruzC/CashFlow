import { requireUserContext } from "@/lib/server/context";
import { OrgType } from "@/lib/types/finance";
import { logError } from "@/lib/server/logger";

function defaultOrgName(profileType: OrgType) {
    return profileType === "personal" ? "Mis Finanzas" : "Mi Negocio";
}

export async function createOrganizationWithOnboarding(profileType: OrgType) {
    const { supabase } = await requireUserContext();

    const { data, error } = await supabase.rpc("create_org_with_onboarding", {
        p_profile_type: profileType,
        p_org_name: defaultOrgName(profileType),
        p_country: "US",
        p_currency: "USD",
    });

    if (error) {
        logError("Error calling onboarding RPC", error, { profileType });
        throw error;
    }
    if (!data) throw new Error("No se pudo crear la organización");

    return String(data);
}

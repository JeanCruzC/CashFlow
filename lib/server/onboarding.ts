import { requireUserContext } from "@/lib/server/context";
import { OrgType } from "@/lib/types/finance";

function defaultOrgName(profileType: OrgType) {
    return profileType === "personal" ? "My Finances" : "My Business";
}

export async function createOrganizationWithOnboarding(profileType: OrgType) {
    const { supabase } = await requireUserContext();

    const { data, error } = await supabase.rpc("create_org_with_onboarding", {
        p_profile_type: profileType,
        p_org_name: defaultOrgName(profileType),
        p_country: "US",
        p_currency: "USD",
    });

    if (error) throw error;
    if (!data) throw new Error("Failed to create organization");

    return String(data);
}

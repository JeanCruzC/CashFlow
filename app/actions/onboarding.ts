"use server";

import { createOrganizationWithOnboarding } from "@/lib/server/onboarding";
import { OrgType } from "@/lib/types/finance";
import { revalidatePath } from "next/cache";

export async function createProfileOrganization(profileType: OrgType) {
    try {
        const orgId = await createOrganizationWithOnboarding(profileType);
        revalidatePath("/dashboard");
        revalidatePath("/onboarding/select-profile");
        return { success: true, orgId };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create profile";
        return { error: message };
    }
}

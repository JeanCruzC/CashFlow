"use server";

import { createOrganizationWithOnboarding, OnboardingSetupInput } from "@/lib/server/onboarding";
import { OrgType } from "@/lib/types/finance";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

export async function createProfileOrganization(profileType: OrgType, setup?: OnboardingSetupInput) {
    try {
        const { user } = await requireUserContext();
        assertRateLimit({
            key: `onboarding-create-org:${user.id}`,
            limit: 10,
            windowMs: 60_000,
        });

        const orgId = await createOrganizationWithOnboarding(profileType, setup);
        revalidatePath("/dashboard");
        revalidatePath("/onboarding/select-profile");
        revalidatePath("/dashboard/settings");
        revalidatePath("/dashboard/accounts");
        return { success: true, orgId };
    } catch (error) {
        logError("Error creating profile organization", error);
        const message = error instanceof Error
            ? error.message
            : (() => {
                if (typeof error === "object" && error !== null) {
                    try {
                        return JSON.stringify(error);
                    } catch {
                        return "No se pudo crear el perfil";
                    }
                }
                return "No se pudo crear el perfil";
            })();
        return { error: message };
    }
}

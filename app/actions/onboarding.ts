"use server";

import { createOrganizationWithOnboarding, OnboardingSetupInput } from "@/lib/server/onboarding";
import { OrgType } from "@/lib/types/finance";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

function normalizeOnboardingActionError(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.trim();
        if (!message) return "No se pudo crear el perfil";

        // Only return curated/domain messages to the UI.
        if (
            message === "No autorizado" ||
            message.startsWith("No se pudo ") ||
            message.startsWith("Límite de solicitudes")
        ) {
            return message;
        }
    }

    return "No se pudo crear el perfil";
}

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
        revalidatePath("/dashboard/categories");
        revalidatePath("/dashboard/budget");
        revalidatePath("/dashboard/forecast");
        revalidatePath("/dashboard/transactions");
        return { success: true, orgId };
    } catch (error) {
        logError("Error creating profile organization", error);
        return { error: normalizeOnboardingActionError(error) };
    }
}

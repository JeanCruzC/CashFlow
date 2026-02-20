import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/server/onboarding", () => ({
    createOrganizationWithOnboarding: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createOrganizationWithOnboarding } from "@/lib/server/onboarding";
import { createProfileOrganization } from "@/app/actions/onboarding";

describe("app/actions/onboarding", () => {
    const createOrganizationMock = vi.mocked(createOrganizationWithOnboarding);
    const revalidatePathMock = vi.mocked(revalidatePath);

    beforeEach(() => {
        createOrganizationMock.mockReset();
        revalidatePathMock.mockReset();
    });

    it("crea organización y revalida rutas críticas", async () => {
        createOrganizationMock.mockResolvedValue("org-123");

        const result = await createProfileOrganization("personal");

        expect(result).toEqual({ success: true, orgId: "org-123" });
        expect(createOrganizationMock).toHaveBeenCalledWith("personal");
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
        expect(revalidatePathMock).toHaveBeenCalledWith("/onboarding/select-profile");
    });

    it("expone error de dominio cuando falla createOrganizationWithOnboarding", async () => {
        createOrganizationMock.mockRejectedValue(new Error("Unauthorized"));

        const result = await createProfileOrganization("business");

        expect(result).toEqual({ error: "Unauthorized" });
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("usa mensaje genérico para errores no tipados", async () => {
        createOrganizationMock.mockRejectedValue("boom");

        const result = await createProfileOrganization("personal");

        expect(result).toEqual({ error: "Failed to create profile" });
    });
});

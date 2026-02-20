import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/server/onboarding", () => ({
    createOrganizationWithOnboarding: vi.fn(),
}));

vi.mock("@/lib/server/context", () => ({
    requireUserContext: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
    assertRateLimit: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createOrganizationWithOnboarding } from "@/lib/server/onboarding";
import { requireUserContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { createProfileOrganization } from "@/app/actions/onboarding";

describe("app/actions/onboarding", () => {
    const createOrganizationMock = vi.mocked(createOrganizationWithOnboarding);
    const revalidatePathMock = vi.mocked(revalidatePath);
    const requireUserContextMock = vi.mocked(requireUserContext);
    const assertRateLimitMock = vi.mocked(assertRateLimit);

    beforeEach(() => {
        createOrganizationMock.mockReset();
        revalidatePathMock.mockReset();
        requireUserContextMock.mockReset();
        assertRateLimitMock.mockReset();
        requireUserContextMock.mockResolvedValue({
            user: { id: "user-1" },
        } as never);
    });

    it("crea organización y revalida rutas críticas", async () => {
        createOrganizationMock.mockResolvedValue("org-123");

        const result = await createProfileOrganization("personal");

        expect(result).toEqual({ success: true, orgId: "org-123" });
        expect(createOrganizationMock).toHaveBeenCalledWith("personal");
        expect(assertRateLimitMock).toHaveBeenCalledWith(
            expect.objectContaining({
                key: "onboarding-create-org:user-1",
            })
        );
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
        expect(revalidatePathMock).toHaveBeenCalledWith("/onboarding/select-profile");
    });

    it("expone error de dominio cuando falla createOrganizationWithOnboarding", async () => {
        createOrganizationMock.mockRejectedValue(new Error("No autorizado"));

        const result = await createProfileOrganization("business");

        expect(result).toEqual({ error: "No autorizado" });
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("usa mensaje genérico para errores no tipados", async () => {
        createOrganizationMock.mockRejectedValue("boom");

        const result = await createProfileOrganization("personal");

        expect(result).toEqual({ error: "No se pudo crear el perfil" });
    });
});

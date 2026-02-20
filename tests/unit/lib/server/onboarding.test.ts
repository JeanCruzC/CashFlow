import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/context", () => ({
    requireUserContext: vi.fn(),
}));

import { requireUserContext } from "@/lib/server/context";
import { createOrganizationWithOnboarding } from "@/lib/server/onboarding";

describe("lib/server/onboarding", () => {
    const requireUserContextMock = vi.mocked(requireUserContext);

    beforeEach(() => {
        requireUserContextMock.mockReset();
    });

    it("invoca RPC con defaults para perfil personal", async () => {
        const rpc = vi.fn().mockResolvedValue({ data: "org-personal-1", error: null });
        requireUserContextMock.mockResolvedValue({
            supabase: { rpc },
            user: { id: "user-1" },
        } as never);

        const orgId = await createOrganizationWithOnboarding("personal");

        expect(orgId).toBe("org-personal-1");
        expect(rpc).toHaveBeenCalledWith("create_org_with_onboarding", {
            p_profile_type: "personal",
            p_org_name: "Mis Finanzas",
            p_country: "US",
            p_currency: "USD",
        });
    });

    it("invoca RPC con defaults para perfil business", async () => {
        const rpc = vi.fn().mockResolvedValue({ data: "org-business-1", error: null });
        requireUserContextMock.mockResolvedValue({
            supabase: { rpc },
            user: { id: "user-1" },
        } as never);

        const orgId = await createOrganizationWithOnboarding("business");

        expect(orgId).toBe("org-business-1");
        expect(rpc).toHaveBeenCalledWith("create_org_with_onboarding", {
            p_profile_type: "business",
            p_org_name: "Mi Negocio",
            p_country: "US",
            p_currency: "USD",
        });
    });

    it("propaga error del RPC", async () => {
        const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") });
        requireUserContextMock.mockResolvedValue({
            supabase: { rpc },
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow("rpc failed");
    });

    it("falla cuando RPC retorna sin data", async () => {
        const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
        requireUserContextMock.mockResolvedValue({
            supabase: { rpc },
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("business")).rejects.toThrow(
            "No se pudo crear la organización"
        );
    });
});

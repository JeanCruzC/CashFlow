import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/context", () => ({
    requireUserContext: vi.fn(),
}));

import { requireUserContext } from "@/lib/server/context";
import { createOrganizationWithOnboarding } from "@/lib/server/onboarding";

function buildSupabaseMock(overrides?: {
    rpcResult?: { data: string | null; error: unknown };
    accountsCount?: number;
    fallbackOrgId?: string;
    categoriesCount?: number;
    costCentersCount?: number;
}) {
    const rpc = vi.fn().mockResolvedValue(overrides?.rpcResult ?? { data: "org-1", error: null });

    const fallbackOrgId = overrides?.fallbackOrgId ?? "org-fallback-1";

    const orgInsertSingle = vi.fn().mockResolvedValue({
        data: { id: fallbackOrgId },
        error: null,
    });
    const orgInsertSelect = vi.fn().mockReturnValue({ single: orgInsertSingle });
    const orgInsert = vi.fn().mockReturnValue({ select: orgInsertSelect });

    const orgDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const orgDelete = vi.fn().mockReturnValue({ eq: orgDeleteEq });

    const orgUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const orgUpdate = vi.fn().mockReturnValue({ eq: orgUpdateEq });

    const orgMembersInsert = vi.fn().mockResolvedValue({ error: null });

    const accountsSelectEq = vi
        .fn()
        .mockResolvedValue({ count: overrides?.accountsCount ?? 0, error: null });
    const accountsSelect = vi.fn().mockReturnValue({ eq: accountsSelectEq });
    const accountsInsert = vi.fn().mockResolvedValue({ error: null });

    const categoriesSelectEq = vi
        .fn()
        .mockResolvedValue({ count: overrides?.categoriesCount ?? 0, error: null });
    const categoriesSelect = vi.fn().mockReturnValue({ eq: categoriesSelectEq });
    const categoriesInsert = vi.fn().mockResolvedValue({ error: null });

    const costCentersSelectEq = vi
        .fn()
        .mockResolvedValue({ count: overrides?.costCentersCount ?? 0, error: null });
    const costCentersSelect = vi.fn().mockReturnValue({ eq: costCentersSelectEq });
    const costCentersInsert = vi.fn().mockResolvedValue({ error: null });

    const onboardingUpsert = vi.fn().mockResolvedValue({ error: null });

    const forecastUpsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
        if (table === "orgs") {
            return { update: orgUpdate, insert: orgInsert, delete: orgDelete };
        }
        if (table === "org_members") {
            return { insert: orgMembersInsert };
        }
        if (table === "accounts") {
            return { select: accountsSelect, insert: accountsInsert };
        }
        if (table === "categories_gl") {
            return { select: categoriesSelect, insert: categoriesInsert };
        }
        if (table === "cost_centers") {
            return { select: costCentersSelect, insert: costCentersInsert };
        }
        if (table === "onboarding_state") {
            return { upsert: onboardingUpsert };
        }
        if (table === "forecast_assumptions") {
            return { upsert: forecastUpsert };
        }
        throw new Error(`Unexpected table ${table}`);
    });

    return {
        supabase: { rpc, from },
        spies: {
            rpc,
            from,
            orgInsert,
            orgInsertSelect,
            orgInsertSingle,
            orgDelete,
            orgDeleteEq,
            orgUpdate,
            orgUpdateEq,
            orgMembersInsert,
            accountsSelect,
            accountsSelectEq,
            accountsInsert,
            categoriesSelect,
            categoriesSelectEq,
            categoriesInsert,
            costCentersSelect,
            costCentersSelectEq,
            costCentersInsert,
            onboardingUpsert,
            forecastUpsert,
        },
    };
}

describe("lib/server/onboarding", () => {
    const requireUserContextMock = vi.mocked(requireUserContext);

    beforeEach(() => {
        requireUserContextMock.mockReset();
    });

    it("crea organización personal con defaults y cuenta inicial", async () => {
        const { supabase, spies } = buildSupabaseMock();
        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        const orgId = await createOrganizationWithOnboarding("personal");

        expect(orgId).toBe("org-1");
        expect(spies.rpc).toHaveBeenCalledWith("create_org_with_onboarding", {
            p_profile_type: "personal",
            p_org_name: "Mis Finanzas",
            p_country: "US",
            p_currency: "USD",
        });
        expect(spies.from).toHaveBeenCalledWith("orgs");
        expect(spies.from).toHaveBeenCalledWith("accounts");
        expect(spies.accountsInsert).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    org_id: "org-1",
                    name: "Cuenta principal",
                    account_type: "bank",
                }),
            ])
        );
        expect(spies.onboardingUpsert).toHaveBeenCalled();
    });

    it("aplica setup business y guarda forecast inicial", async () => {
        const { supabase, spies } = buildSupabaseMock();
        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        const orgId = await createOrganizationWithOnboarding("business", {
            orgName: "CashFlow Labs",
            country: "PE",
            currency: "PEN",
            timezone: "America/Lima",
            preferredLocale: "es",
            accountingBasis: "accrual_basis",
            fiscalYearStartMonth: 4,
            detraccionesEnabled: true,
            forecast: {
                revenueGrowthRate: 8,
                cogsPercent: 35,
                fixedOpex: 12000,
                variableOpexPercent: 14,
                oneOffAmount: 500,
                note: "Baseline",
            },
        });

        expect(orgId).toBe("org-1");
        expect(spies.rpc).toHaveBeenCalledWith("create_org_with_onboarding", {
            p_profile_type: "business",
            p_org_name: "CashFlow Labs",
            p_country: "PE",
            p_currency: "PEN",
        });
        expect(spies.orgUpdate).toHaveBeenCalled();
        expect(spies.forecastUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                org_id: "org-1",
                cogs_percent: 35,
                variable_opex_percent: 14,
            }),
            { onConflict: "org_id,month" }
        );
    });

    it("propaga error del RPC", async () => {
        const { supabase } = buildSupabaseMock({
            rpcResult: { data: null, error: new Error("rpc failed") },
        });
        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow("rpc failed");
    });

    it("falla cuando RPC retorna sin data", async () => {
        const { supabase } = buildSupabaseMock({
            rpcResult: { data: null, error: null },
        });
        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("business")).rejects.toThrow(
            "No se pudo crear la organización"
        );
    });

    it("hace fallback cuando el RPC no está disponible", async () => {
        const { supabase, spies } = buildSupabaseMock({
            rpcResult: {
                data: null,
                error: {
                    code: "PGRST202",
                    message: "Could not find function public.create_org_with_onboarding",
                    details: "schema cache",
                },
            },
            fallbackOrgId: "org-fallback-99",
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        const orgId = await createOrganizationWithOnboarding("personal");

        expect(orgId).toBe("org-fallback-99");
        expect(spies.orgInsert).toHaveBeenCalled();
        expect(spies.orgMembersInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                org_id: "org-fallback-99",
                user_id: "user-1",
                role: "owner",
            })
        );
        expect(spies.categoriesInsert).toHaveBeenCalled();
    });
});

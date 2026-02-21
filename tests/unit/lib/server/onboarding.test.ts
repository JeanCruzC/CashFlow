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
    orgInsertError?: unknown;
    orgUpdateError?: unknown;
    orgDeleteError?: unknown;
    accountCountError?: unknown;
    accountsInsertError?: unknown;
    categoriesCountError?: unknown;
    categoriesInsertError?: unknown;
    costCentersCountError?: unknown;
    costCentersInsertError?: unknown;
    orgMembersInsertError?: unknown;
    onboardingUpsertErrors?: unknown[];
    forecastUpsertError?: unknown;
}) {
    const rpc = vi.fn().mockResolvedValue(overrides?.rpcResult ?? { data: "org-1", error: null });

    const fallbackOrgId = overrides?.fallbackOrgId ?? "org-fallback-1";

    const orgInsertSingle = vi.fn().mockResolvedValue({
        data: overrides?.orgInsertError ? null : { id: fallbackOrgId },
        error: overrides?.orgInsertError ?? null,
    });
    const orgInsertSelect = vi.fn().mockReturnValue({ single: orgInsertSingle });
    const orgInsert = vi.fn().mockReturnValue({ select: orgInsertSelect });

    const orgDeleteEq = vi.fn().mockResolvedValue({ error: overrides?.orgDeleteError ?? null });
    const orgDelete = vi.fn().mockReturnValue({ eq: orgDeleteEq });

    const orgUpdateEq = vi.fn().mockResolvedValue({ error: overrides?.orgUpdateError ?? null });
    const orgUpdate = vi.fn().mockReturnValue({ eq: orgUpdateEq });

    const orgMembersInsert = vi
        .fn()
        .mockResolvedValue({ error: overrides?.orgMembersInsertError ?? null });

    const accountsSelectEq = vi
        .fn()
        .mockResolvedValue({
            count: overrides?.accountsCount ?? 0,
            error: overrides?.accountCountError ?? null,
        });
    const accountsSelect = vi.fn().mockReturnValue({ eq: accountsSelectEq });
    const accountsInsert = vi
        .fn()
        .mockResolvedValue({ error: overrides?.accountsInsertError ?? null });

    const categoriesSelectEq = vi
        .fn()
        .mockResolvedValue({
            count: overrides?.categoriesCount ?? 0,
            error: overrides?.categoriesCountError ?? null,
        });
    const categoriesSelect = vi.fn().mockReturnValue({ eq: categoriesSelectEq });
    const categoriesInsert = vi
        .fn()
        .mockResolvedValue({ error: overrides?.categoriesInsertError ?? null });

    const costCentersSelectEq = vi
        .fn()
        .mockResolvedValue({
            count: overrides?.costCentersCount ?? 0,
            error: overrides?.costCentersCountError ?? null,
        });
    const costCentersSelect = vi.fn().mockReturnValue({ eq: costCentersSelectEq });
    const costCentersInsert = vi
        .fn()
        .mockResolvedValue({ error: overrides?.costCentersInsertError ?? null });

    const onboardingUpsertQueue = [...(overrides?.onboardingUpsertErrors ?? [])];
    const onboardingUpsert = vi.fn().mockImplementation(() =>
        Promise.resolve({ error: onboardingUpsertQueue.length > 0 ? onboardingUpsertQueue.shift() ?? null : null })
    );

    const forecastUpsert = vi
        .fn()
        .mockResolvedValue({ error: overrides?.forecastUpsertError ?? null });

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

    it("normaliza error de RPC no fallback con message/details/hint/code", async () => {
        const { supabase } = buildSupabaseMock({
            rpcResult: {
                data: null,
                error: {
                    message: "rpc denied",
                    details: "details",
                    hint: "hint",
                    code: "XX001",
                },
            },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "rpc denied | details | hint | code=XX001"
        );
    });

    it("normaliza error circular cuando no se puede serializar", async () => {
        const circular: { self?: unknown } = {};
        circular.self = circular;

        const { supabase } = buildSupabaseMock({
            rpcResult: {
                data: null,
                error: circular,
            },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "Error desconocido en onboarding"
        );
    });

    it("ejecuta fallback business y crea centros de costo", async () => {
        const { supabase, spies } = buildSupabaseMock({
            rpcResult: {
                data: null,
                error: {
                    code: "42883",
                    message: "function does not exist",
                },
            },
            fallbackOrgId: "org-fallback-business",
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        const orgId = await createOrganizationWithOnboarding("business", {
            forecast: {},
        });

        expect(orgId).toBe("org-fallback-business");
        expect(spies.costCentersInsert).toHaveBeenCalled();
        expect(spies.forecastUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                org_id: "org-fallback-business",
                revenue_growth_rate: null,
                cogs_percent: null,
                fixed_opex: null,
                variable_opex_percent: null,
                one_off_amount: null,
                note: null,
            }),
            { onConflict: "org_id,month" }
        );
    });

    it("falla si no se puede actualizar la configuración de la organización", async () => {
        const { supabase } = buildSupabaseMock({
            orgUpdateError: { message: "org update failed" },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "No se pudo guardar la configuración de la organización"
        );
    });

    it("falla si no se puede contar cuentas del onboarding", async () => {
        const { supabase } = buildSupabaseMock({
            accountCountError: { message: "accounts count failed" },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "No se pudo preparar la organización"
        );
    });

    it("falla si no se pueden crear cuentas iniciales", async () => {
        const { supabase } = buildSupabaseMock({
            accountsInsertError: { message: "insert accounts failed" },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(
            createOrganizationWithOnboarding("personal", {
                firstAccount: {
                    name: "Cuenta custom",
                    accountType: "cash",
                    openingBalance: 10,
                },
            })
        ).rejects.toThrow("No se pudieron crear las cuentas iniciales");
    });

    it("falla si no se puede guardar forecast inicial", async () => {
        const { supabase } = buildSupabaseMock({
            forecastUpsertError: { message: "forecast failed" },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(
            createOrganizationWithOnboarding("business", {
                forecast: {
                    revenueGrowthRate: 5,
                },
            })
        ).rejects.toThrow("No se pudo guardar el pronóstico inicial");
    });

    it("falla si no se puede finalizar onboarding_state", async () => {
        const { supabase } = buildSupabaseMock({
            onboardingUpsertErrors: [{ message: "final onboarding failed" }],
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "No se pudo finalizar el onboarding"
        );
    });

    it("en fallback limpia org creada si falla inserción de miembro", async () => {
        const { supabase, spies } = buildSupabaseMock({
            rpcResult: {
                data: null,
                error: {
                    code: "PGRST202",
                    message: "Could not find function public.create_org_with_onboarding",
                    details: "schema cache",
                },
            },
            orgMembersInsertError: { message: "member insert failed" },
            fallbackOrgId: "org-cleanup-1",
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "member insert failed"
        );
        expect(spies.orgDeleteEq).toHaveBeenCalledWith("id", "org-cleanup-1");
    });

    it("en fallback falla cuando creación de org retorna error", async () => {
        const { supabase } = buildSupabaseMock({
            rpcResult: {
                data: null,
                error: {
                    code: "42501",
                    message: "permission denied for function",
                },
            },
            orgInsertError: { message: "create org failed" },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "create org failed"
        );
    });

    it("en fallback falla si no se pueden crear categorías seed", async () => {
        const { supabase } = buildSupabaseMock({
            rpcResult: {
                data: null,
                error: {
                    code: "PGRST202",
                    message: "Could not find function public.create_org_with_onboarding",
                    details: "schema cache",
                },
            },
            categoriesInsertError: { message: "categories seed failed" },
        });

        requireUserContextMock.mockResolvedValue({
            supabase,
            user: { id: "user-1" },
        } as never);

        await expect(createOrganizationWithOnboarding("personal")).rejects.toThrow(
            "categories seed failed"
        );
    });
});

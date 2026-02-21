import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/server/context", () => ({
    requireOrgContext: vi.fn(),
    requireOrgActorContext: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
    assertRateLimit: vi.fn(),
}));

vi.mock("@/lib/server/logger", () => ({
    logError: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { requireOrgActorContext, requireOrgContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import {
    createTransaction,
    deleteTransaction,
    getTransactionById,
    getTransactions,
    updateTransaction,
} from "@/app/actions/transactions";

const VALID_UUIDS = {
    account: "11111111-1111-4111-8111-111111111111",
    category: "22222222-2222-4222-8222-222222222222",
};

function buildTransactionsQuery(result: {
    data?: unknown[];
    error?: { message: string } | null;
    count?: number | null;
}) {
    const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi
            .fn()
            .mockResolvedValue({ data: result.data ?? [], error: result.error ?? null, count: result.count ?? 0 }),
    };

    return query;
}

function buildEqChainWithSelect(result: { data: unknown; error: { message: string } | null }) {
    const query = {
        eq: vi.fn(),
        select: vi.fn().mockResolvedValue(result),
    };
    query.eq.mockImplementation(() => query);
    return query;
}

function buildEqChainWithMaybeSingle(result: { data: unknown; error: { message: string } | null }) {
    const query = {
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(result),
    };
    query.eq.mockImplementation(() => query);
    return query;
}

function buildDeleteQuery(result: { error: { message: string } | null; count: number | null }) {
    const query: { eq: ReturnType<typeof vi.fn> } = {
        eq: vi.fn(),
    };

    query.eq.mockImplementationOnce(() => query);
    query.eq.mockResolvedValueOnce(result);

    return query;
}

describe("app/actions/transactions", () => {
    const revalidatePathMock = vi.mocked(revalidatePath);
    const requireOrgContextMock = vi.mocked(requireOrgContext);
    const requireOrgActorContextMock = vi.mocked(requireOrgActorContext);
    const assertRateLimitMock = vi.mocked(assertRateLimit);

    beforeEach(() => {
        revalidatePathMock.mockReset();
        requireOrgContextMock.mockReset();
        requireOrgActorContextMock.mockReset();
        requireOrgActorContextMock.mockImplementation(() => requireOrgContextMock() as never);
        assertRateLimitMock.mockReset();
    });

    it("sanitiza sort/search/paginación y aplica filtros soportados", async () => {
        const query = buildTransactionsQuery({ data: [{ id: "tx-1" }], count: 1 });
        const supabase = {
            from: vi.fn().mockReturnValue(query),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await getTransactions({
            page: 0,
            pageSize: -10,
            sort: "accounts.name",
            sortDir: "desc",
            search: "  renta  ",
            accountId: "acc-1",
            categoryId: "cat-1",
            direction: "income",
            dateFrom: "2026-02-01",
            dateTo: "2026-02-28",
        });

        expect(supabase.from).toHaveBeenCalledWith("transactions");
        expect(query.eq).toHaveBeenCalledWith("org_id", "org-1");
        expect(query.ilike).toHaveBeenCalledWith("description", "%renta%");
        expect(query.eq).toHaveBeenCalledWith("account_id", "acc-1");
        expect(query.eq).toHaveBeenCalledWith("category_gl_id", "cat-1");
        expect(query.gt).toHaveBeenCalledWith("amount", 0);
        expect(query.gte).toHaveBeenCalledWith("date", "2026-02-01");
        expect(query.lte).toHaveBeenCalledWith("date", "2026-02-28");
        expect(query.order).toHaveBeenCalledWith("date", { ascending: false });
        expect(query.range).toHaveBeenCalledWith(0, 19);
        expect(result).toEqual({ data: [{ id: "tx-1" }], count: 1 });
    });

    it("aplica filtro de egresos cuando direction es expense", async () => {
        const query = buildTransactionsQuery({ data: [], count: 0 });
        const supabase = {
            from: vi.fn().mockReturnValue(query),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        await getTransactions({
            direction: "expense",
        });

        expect(query.lt).toHaveBeenCalledWith("amount", 0);
    });

    it("lanza error controlado cuando falla la consulta", async () => {
        const query = buildTransactionsQuery({
            data: [],
            count: 0,
            error: { message: "boom" },
        });
        const supabase = {
            from: vi.fn().mockReturnValue(query),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        await expect(getTransactions({})).rejects.toThrow("No se pudieron cargar las transacciones");
    });

    it("obtiene transacción por id", async () => {
        const query = buildEqChainWithMaybeSingle({
            data: { id: "tx-1", description: "Pago" },
            error: null,
        });
        const supabase = {
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue(query),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await getTransactionById("tx-1");
        expect(result).toEqual({ id: "tx-1", description: "Pago" });
    });

    it("getTransactionById lanza error controlado cuando falla", async () => {
        const query = buildEqChainWithMaybeSingle({
            data: null,
            error: { message: "select failed" },
        });
        const supabase = {
            from: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue(query),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        await expect(getTransactionById("tx-1")).rejects.toThrow("No se pudo cargar la transacción");
    });

    it("rechaza payload inválido en createTransaction", async () => {
        const result = await createTransaction({
            date: "",
            description: "",
            account_id: "no-uuid",
            amount: 0,
            currency: "USD",
            is_transfer: false,
        });

        expect(result.error).toBeTruthy();
        expect(requireOrgContextMock).not.toHaveBeenCalled();
    });

    it("bloquea createTransaction cuando excede rate limit", async () => {
        assertRateLimitMock.mockImplementation(() => {
            throw new Error("rate limited");
        });

        requireOrgContextMock.mockResolvedValue({
            supabase: { from: vi.fn() },
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await createTransaction({
            date: "2026-02-20",
            description: "Pago cliente",
            account_id: VALID_UUIDS.account,
            amount: 950,
            currency: "USD",
            is_transfer: false,
        });

        expect(result).toEqual({ error: "rate limited" });
    });

    it("crea transacción y revalida rutas cuando el payload es válido", async () => {
        const insert = vi.fn().mockResolvedValue({ error: null });
        const supabase = {
            from: vi.fn().mockReturnValue({ insert }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await createTransaction({
            date: "2026-02-20",
            description: "Pago cliente",
            account_id: VALID_UUIDS.account,
            category_gl_id: VALID_UUIDS.category,
            amount: 950,
            currency: "USD",
            is_transfer: false,
        });

        expect(result).toEqual({ success: true });
        expect(supabase.from).toHaveBeenCalledWith("transactions");
        expect(insert).toHaveBeenCalledWith(
            expect.objectContaining({
                org_id: "org-1",
                created_by: "user-1",
                description: "Pago cliente",
                amount: 950,
            })
        );
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/transactions");
    });

    it("devuelve error controlado cuando falla createTransaction", async () => {
        const insert = vi.fn().mockResolvedValue({ error: { message: "insert failed" } });
        const supabase = {
            from: vi.fn().mockReturnValue({ insert }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await createTransaction({
            date: "2026-02-20",
            description: "Pago",
            account_id: VALID_UUIDS.account,
            amount: 500,
            currency: "USD",
            is_transfer: false,
        });

        expect(result).toEqual({ error: "No se pudo crear la transacción" });
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("updateTransaction retorna éxito y revalida cuando hay filas afectadas", async () => {
        const updateQuery = buildEqChainWithSelect({
            data: [{ id: "tx-1" }],
            error: null,
        });
        const supabase = {
            from: vi.fn().mockReturnValue({
                update: vi.fn().mockReturnValue(updateQuery),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await updateTransaction("tx-1", {
            date: "2026-02-20",
            description: "Pago actualizado",
            account_id: VALID_UUIDS.account,
            amount: 100,
            currency: "USD",
            is_transfer: false,
        });

        expect(result).toEqual({ success: true });
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/transactions");
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/transactions/tx-1/edit");
    });

    it("updateTransaction devuelve error cuando no afecta filas", async () => {
        const updateQuery = buildEqChainWithSelect({
            data: [],
            error: null,
        });
        const supabase = {
            from: vi.fn().mockReturnValue({
                update: vi.fn().mockReturnValue(updateQuery),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await updateTransaction("tx-unknown", {
            date: "2026-02-20",
            description: "Pago",
            account_id: VALID_UUIDS.account,
            amount: 100,
            currency: "USD",
            is_transfer: false,
        });

        expect(result).toEqual({ error: "Transacción no encontrada o sin permisos" });
    });

    it("updateTransaction devuelve error cuando falla query", async () => {
        const updateQuery = buildEqChainWithSelect({
            data: [],
            error: { message: "update failed" },
        });
        const supabase = {
            from: vi.fn().mockReturnValue({
                update: vi.fn().mockReturnValue(updateQuery),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await updateTransaction("tx-1", {
            date: "2026-02-20",
            description: "Pago",
            account_id: VALID_UUIDS.account,
            amount: 100,
            currency: "USD",
            is_transfer: false,
        });

        expect(result).toEqual({ error: "No se pudo actualizar la transacción" });
    });

    it("bloquea updateTransaction cuando excede rate limit", async () => {
        assertRateLimitMock.mockImplementation(() => {
            throw new Error("rate limited");
        });

        requireOrgContextMock.mockResolvedValue({
            supabase: { from: vi.fn() },
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await updateTransaction("tx-1", {
            date: "2026-02-20",
            description: "Pago",
            account_id: VALID_UUIDS.account,
            amount: 100,
            currency: "USD",
            is_transfer: false,
        });

        expect(result).toEqual({ error: "rate limited" });
    });

    it("elimina transacción si pertenece a la organización y revalida", async () => {
        const deleteQuery = buildDeleteQuery({ error: null, count: 1 });
        const supabase = {
            from: vi.fn().mockReturnValue({
                delete: vi.fn().mockReturnValue(deleteQuery),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await deleteTransaction("tx-1");

        expect(result).toEqual({ success: true });
        expect(deleteQuery.eq).toHaveBeenNthCalledWith(1, "id", "tx-1");
        expect(deleteQuery.eq).toHaveBeenNthCalledWith(2, "org_id", "org-1");
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
        expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/transactions");
    });

    it("bloquea deleteTransaction cuando excede rate limit", async () => {
        assertRateLimitMock.mockImplementation(() => {
            throw new Error("rate limited");
        });

        requireOrgContextMock.mockResolvedValue({
            supabase: { from: vi.fn() },
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await deleteTransaction("tx-1");

        expect(result).toEqual({ error: "rate limited" });
    });

    it("devuelve error controlado cuando falla deleteTransaction", async () => {
        const deleteQuery = buildDeleteQuery({ error: { message: "delete failed" }, count: 0 });
        const supabase = {
            from: vi.fn().mockReturnValue({
                delete: vi.fn().mockReturnValue(deleteQuery),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await deleteTransaction("tx-1");

        expect(result).toEqual({ error: "No se pudo eliminar la transacción" });
    });

    it("devuelve error de autorización/ausencia cuando delete no afecta filas", async () => {
        const deleteQuery = buildDeleteQuery({ error: null, count: 0 });
        const supabase = {
            from: vi.fn().mockReturnValue({
                delete: vi.fn().mockReturnValue(deleteQuery),
            }),
        };

        requireOrgContextMock.mockResolvedValue({
            supabase,
            orgId: "org-1",
            user: { id: "user-1" },
        } as never);

        const result = await deleteTransaction("tx-unknown");

        expect(result).toEqual({ error: "Transacción no encontrada o sin permisos" });
    });
});

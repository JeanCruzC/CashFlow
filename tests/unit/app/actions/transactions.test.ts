import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("@/lib/server/context", () => ({
    requireOrgContext: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/server/context";
import {
    createTransaction,
    deleteTransaction,
    getTransactions,
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
        order: vi.fn().mockReturnThis(),
        range: vi
            .fn()
            .mockResolvedValue({ data: result.data ?? [], error: result.error ?? null, count: result.count ?? 0 }),
    };

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

    beforeEach(() => {
        revalidatePathMock.mockReset();
        requireOrgContextMock.mockReset();
    });

    it("sanitiza sort/search/pagination y ejecuta query segura", async () => {
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
        });

        expect(supabase.from).toHaveBeenCalledWith("transactions");
        expect(query.eq).toHaveBeenCalledWith("org_id", "org-1");
        expect(query.ilike).toHaveBeenCalledWith("description", "%renta%");
        expect(query.order).toHaveBeenCalledWith("date", { ascending: false });
        expect(query.range).toHaveBeenCalledWith(0, 19);
        expect(result).toEqual({ data: [{ id: "tx-1" }], count: 1 });
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

        await expect(getTransactions({})).rejects.toThrow("Failed to fetch transactions");
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

        expect(result).toEqual({ error: "Failed to create transaction" });
        expect(revalidatePathMock).not.toHaveBeenCalled();
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

        expect(result).toEqual({ error: "Transaction not found or not allowed" });
    });
});

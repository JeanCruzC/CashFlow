"use server";

import { revalidatePath } from "next/cache";
import { transactionSchema, TransactionInput } from "@/lib/validations/schemas";
import { requireOrgActorContext, requireOrgContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";
import {
    clampPositiveInt,
    sanitizeIsoDate,
    sanitizeSearchTerm,
    sanitizeUuid,
} from "@/lib/server/input-sanitizers";

const SORTABLE_COLUMNS = new Set(["date", "description", "amount", "created_at"]);

export interface TransactionFilters {
    accountId?: string;
    categoryId?: string;
    direction?: "income" | "expense" | "all";
    dateFrom?: string;
    dateTo?: string;
}

export async function getTransactions({
    page = 1,
    pageSize = 20,
    sort = "date",
    sortDir = "desc",
    search = "",
    accountId,
    categoryId,
    direction = "all",
    dateFrom,
    dateTo,
}: {
    page?: number;
    pageSize?: number;
    sort?: string;
    sortDir?: "asc" | "desc";
    search?: string;
} & TransactionFilters) {
    const { supabase, orgId } = await requireOrgContext();
    const safeSort = SORTABLE_COLUMNS.has(sort) ? sort : "date";
    const safeSortDir: "asc" | "desc" = sortDir === "asc" ? "asc" : "desc";
    const safePage = clampPositiveInt(page, 1, 1, 10_000);
    const safePageSize = clampPositiveInt(pageSize, 20, 1, 100);
    const safeSearch = sanitizeSearchTerm(search, 120);
    const safeAccountId = sanitizeUuid(accountId);
    const safeCategoryId = sanitizeUuid(categoryId);
    const safeDateFrom = sanitizeIsoDate(dateFrom);
    const safeDateTo = sanitizeIsoDate(dateTo);
    const safeDirection = direction === "income" || direction === "expense" ? direction : "all";

    let query = supabase
        .from("transactions")
        .select("*, accounts(name), categories_gl(name)", { count: "estimated" })
        .eq("org_id", orgId);

    if (safeSearch) {
        query = query.ilike("description", `%${safeSearch}%`);
    }

    if (safeAccountId) {
        query = query.eq("account_id", safeAccountId);
    }

    if (safeCategoryId) {
        query = query.eq("category_gl_id", safeCategoryId);
    }

    if (safeDirection === "income") {
        query = query.gt("amount", 0);
    } else if (safeDirection === "expense") {
        query = query.lt("amount", 0);
    }

    if (safeDateFrom) {
        query = query.gte("date", safeDateFrom);
    }
    if (safeDateTo) {
        query = query.lte("date", safeDateTo);
    }

    query = query.order(safeSort, { ascending: safeSortDir === "asc" });

    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        logError("Error fetching transactions", error, {
            orgId,
            sort: safeSort,
            sortDir: safeSortDir,
        });
        throw new Error("No se pudieron cargar las transacciones");
    }

    return { data, count: count || 0 };
}

export async function getTransactionById(id: string) {
    const safeId = sanitizeUuid(id);
    if (!safeId) return null;

    const { supabase, orgId } = await requireOrgContext();

    const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", safeId)
        .eq("org_id", orgId)
        .maybeSingle();

    if (error) {
        logError("Error fetching transaction by id", error, { orgId, transactionId: id });
        throw new Error("No se pudo cargar la transacción");
    }

    return data;
}

export async function createTransaction(input: TransactionInput) {
    const validation = transactionSchema.safeParse(input);
    if (!validation.success) {
        return { error: validation.error.message };
    }

    const { supabase, user, orgId } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `create-transaction:${user.id}`,
            limit: 50,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { error } = await supabase.from("transactions").insert({
        ...validation.data,
        org_id: orgId,
        created_by: user.id,
    });

    if (error) {
        logError("Error creating transaction", error, { orgId, userId: user.id });
        return { error: "No se pudo crear la transacción" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
}

export async function updateTransaction(id: string, input: TransactionInput) {
    const safeId = sanitizeUuid(id);
    if (!safeId) {
        return { error: "Identificador de transacción inválido" };
    }

    const validation = transactionSchema.safeParse(input);
    if (!validation.success) {
        return { error: validation.error.message };
    }

    const { supabase, user, orgId } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `update-transaction:${user.id}`,
            limit: 50,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { data, error } = await supabase
        .from("transactions")
        .update({
            ...validation.data,
        })
        .eq("id", safeId)
        .eq("org_id", orgId)
        .select("id");

    if (error) {
        logError("Error updating transaction", error, { orgId, userId: user.id, transactionId: id });
        return { error: "No se pudo actualizar la transacción" };
    }
    if (!data || data.length === 0) {
        return { error: "Transacción no encontrada o sin permisos" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    revalidatePath(`/dashboard/transactions/${safeId}/edit`);
    return { success: true };
}

export async function deleteTransaction(id: string) {
    const safeId = sanitizeUuid(id);
    if (!safeId) {
        return { error: "Identificador de transacción inválido" };
    }

    const { supabase, orgId, user } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `delete-transaction:${user.id}`,
            limit: 40,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { error, count } = await supabase
        .from("transactions")
        .delete({ count: "exact" })
        .eq("id", safeId)
        .eq("org_id", orgId);

    if (error) {
        logError("Error deleting transaction", error, { orgId, userId: user.id, transactionId: id });
        return { error: "No se pudo eliminar la transacción" };
    }
    if (!count || count === 0) {
        return { error: "Transacción no encontrada o sin permisos" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
}

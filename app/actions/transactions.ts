"use server";

import { transactionSchema, TransactionInput } from "@/lib/validations/schemas";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/server/context";

const SORTABLE_COLUMNS = new Set(["date", "description", "amount", "created_at"]);

export async function getTransactions({
    page = 1,
    pageSize = 20,
    sort = "date",
    sortDir = "desc",
    search = "",
}: {
    page?: number;
    pageSize?: number;
    sort?: string;
    sortDir?: "asc" | "desc";
    search?: string;
}) {
    const { supabase, orgId } = await requireOrgContext();
    const safeSort = SORTABLE_COLUMNS.has(sort) ? sort : "date";
    const safeSortDir: "asc" | "desc" = sortDir === "asc" ? "asc" : "desc";
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;
    const safeSearch = search.trim();

    let query = supabase
        .from("transactions")
        .select("*, accounts(name), categories_gl(name)", { count: "exact" })
        .eq("org_id", orgId);

    if (safeSearch) {
        query = query.ilike("description", `%${safeSearch}%`);
    }

    // Order
    query = query.order(safeSort, { ascending: safeSortDir === "asc" });

    // Pagination
    const from = (safePage - 1) * safePageSize;
    const to = from + safePageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error("Error fetching transactions:", error);
        throw new Error("Failed to fetch transactions");
    }

    return { data, count: count || 0 };
}

export async function createTransaction(input: TransactionInput) {
    const validation = transactionSchema.safeParse(input);
    if (!validation.success) {
        return { error: validation.error.message };
    }

    const { supabase, user, orgId } = await requireOrgContext();

    const { error } = await supabase.from("transactions").insert({
        ...validation.data,
        org_id: orgId,
        created_by: user.id,
    });

    if (error) {
        console.error("Error creating transaction:", error);
        return { error: "Failed to create transaction" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
}

export async function deleteTransaction(id: string) {
    const { supabase, orgId } = await requireOrgContext();
    const { error, count } = await supabase
        .from("transactions")
        .delete({ count: "exact" })
        .eq("id", id)
        .eq("org_id", orgId);

    if (error) {
        console.error("Error deleting transaction:", error);
        return { error: "Failed to delete transaction" };
    }
    if (!count || count === 0) {
        return { error: "Transaction not found or not allowed" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
}

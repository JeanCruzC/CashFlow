"use server";

import { budgetSchema, BudgetInput } from "@/lib/validations/schemas";
import { getOrgContextOrNull } from "@/lib/server/context";
import { requireOrgActorContext } from "@/lib/server/context";
import { revalidatePath } from "next/cache";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

interface BudgetRow {
    category: string;
    budget: number;
    actual: number;
    remaining: number;
    progress: number;
}

export interface BudgetOverview {
    month: string;
    currency: string;
    orgType: "personal" | "business";
    totalBudget: number;
    totalActual: number;
    totalRemaining: number;
    rows: BudgetRow[];
}

interface CopyBudgetPlanInput {
    sourceMonth: string;
    targetMonth: string;
}

interface BudgetQueryRow {
    category_gl_id: string;
    amount: number | string;
    categories_gl: { name: string } | { name: string }[] | null;
}

interface TransactionQueryRow {
    category_gl_id: string | null;
    amount: number | string;
}

function resolveMonth(month?: string) {
    if (month && /^\d{4}-\d{2}$/.test(month)) return month;
    return new Date().toISOString().slice(0, 7);
}

function monthRange(month: string) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, m - 1, 1));
    const end = new Date(Date.UTC(year, m, 1));
    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
}

export async function getBudgetOverview(month?: string): Promise<BudgetOverview> {
    const targetMonth = resolveMonth(month);
    const { start, end } = monthRange(targetMonth);

    const context = await getOrgContextOrNull();
    if (!context) {
        return {
            month: targetMonth,
            currency: "USD",
            orgType: "personal",
            totalBudget: 0,
            totalActual: 0,
            totalRemaining: 0,
            rows: [],
        };
    }
    const { supabase, orgId } = context;

    const [orgResult, budgetsResult, transactionsResult] = await Promise.all([
        supabase
            .from("orgs")
            .select("type, currency")
            .eq("id", orgId)
            .maybeSingle(),
        supabase
            .from("budgets")
            .select("category_gl_id, amount, categories_gl(name)")
            .eq("org_id", orgId)
            .eq("month", targetMonth),
        supabase
            .from("transactions")
            .select("category_gl_id, amount")
            .eq("org_id", orgId)
            .gte("date", start)
            .lt("date", end),
    ]);

    if (orgResult.error || !orgResult.data) {
        logError("Error fetching org in budget overview", orgResult.error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el presupuesto");
    }
    if (budgetsResult.error) {
        logError("Error fetching budgets in overview", budgetsResult.error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el presupuesto");
    }
    if (transactionsResult.error) {
        logError("Error fetching transactions in budget overview", transactionsResult.error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el presupuesto");
    }

    const budgets = (budgetsResult.data || []) as BudgetQueryRow[];
    const transactions = (transactionsResult.data || []) as TransactionQueryRow[];

    const actualByCategory = new Map<string, number>();
    transactions.forEach((txn) => {
        if (!txn.category_gl_id) return;
        const current = actualByCategory.get(txn.category_gl_id) || 0;
        actualByCategory.set(txn.category_gl_id, current + Math.abs(Number(txn.amount)));
    });

    const rows: BudgetRow[] = budgets.map((item) => {
        const budget = Number(item.amount);
        const actual = actualByCategory.get(item.category_gl_id) || 0;
        const remaining = budget - actual;
        const progress = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
        const categoryName =
            item.categories_gl && !Array.isArray(item.categories_gl)
                ? item.categories_gl.name
                : "Uncategorized";

        return {
            category: categoryName,
            budget,
            actual,
            remaining,
            progress,
        };
    });

    const totalBudget = rows.reduce((sum, row) => sum + row.budget, 0);
    const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
    const totalRemaining = totalBudget - totalActual;

    return {
        month: targetMonth,
        currency: orgResult.data.currency || "USD",
        orgType: orgResult.data.type === "business" ? "business" : "personal",
        totalBudget,
        totalActual,
        totalRemaining,
        rows,
    };
}

export async function copyBudgetPlan(input: CopyBudgetPlanInput) {
    const sourceMonth = input.sourceMonth?.trim();
    const targetMonth = input.targetMonth?.trim();

    if (!/^\d{4}-\d{2}$/.test(sourceMonth) || !/^\d{4}-\d{2}$/.test(targetMonth)) {
        return { error: "Mes inválido. Usa formato YYYY-MM." };
    }

    if (sourceMonth === targetMonth) {
        return { error: "El mes de origen y destino no pueden ser iguales." };
    }

    const { supabase, orgId, user } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `copy-budget:${user.id}`,
            limit: 12,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { data: sourceRows, error: sourceError } = await supabase
        .from("budgets")
        .select("category_gl_id, cost_center_id, amount")
        .eq("org_id", orgId)
        .eq("month", sourceMonth);

    if (sourceError) {
        logError("Error reading source budget month", sourceError, { orgId, sourceMonth, userId: user.id });
        return { error: "No se pudo leer el mes origen." };
    }

    if (!sourceRows || sourceRows.length === 0) {
        return { error: "El mes origen no tiene categorías presupuestadas." };
    }

    const { error: clearError } = await supabase
        .from("budgets")
        .delete()
        .eq("org_id", orgId)
        .eq("month", targetMonth);

    if (clearError) {
        logError("Error clearing target budget month", clearError, { orgId, targetMonth, userId: user.id });
        return { error: "No se pudo limpiar el mes destino." };
    }

    const insertRows = sourceRows.map((row) => ({
        org_id: orgId,
        month: targetMonth,
        category_gl_id: row.category_gl_id,
        cost_center_id: row.cost_center_id,
        amount: Number(row.amount),
    }));

    const { error: insertError } = await supabase.from("budgets").insert(insertRows);
    if (insertError) {
        logError("Error copying budget month", insertError, {
            orgId,
            sourceMonth,
            targetMonth,
            userId: user.id,
            rows: insertRows.length,
        });
        return { error: "No se pudo copiar el plan al mes destino." };
    }

    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard");

    return {
        success: true,
        copiedCount: insertRows.length,
    };
}

export async function upsertBudget(input: BudgetInput) {
    const validation = budgetSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();
    const payload = validation.data;

    try {
        assertRateLimit({
            key: `upsert-budget:${user.id}`,
            limit: 40,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const { data: existing, error: existingError } = await supabase
        .from("budgets")
        .select("id")
        .eq("org_id", orgId)
        .eq("month", payload.month)
        .eq("category_gl_id", payload.category_gl_id)
        .is("cost_center_id", null)
        .maybeSingle();

    if (existingError) {
        logError("Error checking budget existence", existingError, { orgId, userId: user.id });
        return { error: "No se pudo validar el presupuesto actual" };
    }

    if (existing?.id) {
        const { error } = await supabase
            .from("budgets")
            .update({
                amount: payload.amount,
            })
            .eq("id", existing.id)
            .eq("org_id", orgId);

        if (error) {
            logError("Error updating budget", error, { orgId, userId: user.id, budgetId: existing.id });
            return { error: "No se pudo actualizar el presupuesto" };
        }
    } else {
        const { error } = await supabase.from("budgets").insert({
            org_id: orgId,
            month: payload.month,
            category_gl_id: payload.category_gl_id,
            cost_center_id: null,
            amount: payload.amount,
        });

        if (error) {
            logError("Error creating budget", error, { orgId, userId: user.id });
            return { error: "No se pudo crear el presupuesto" };
        }
    }

    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard");
    return { success: true };
}

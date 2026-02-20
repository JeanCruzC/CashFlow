"use server";

import { getOrgContextOrNull } from "@/lib/server/context";

interface BudgetRow {
    category: string;
    budget: number;
    actual: number;
    remaining: number;
    progress: number;
}

export interface BudgetOverview {
    month: string;
    totalBudget: number;
    totalActual: number;
    totalRemaining: number;
    rows: BudgetRow[];
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
            totalBudget: 0,
            totalActual: 0,
            totalRemaining: 0,
            rows: [],
        };
    }
    const { supabase, orgId } = context;

    const [budgetsResult, transactionsResult] = await Promise.all([
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

    if (budgetsResult.error) throw budgetsResult.error;
    if (transactionsResult.error) throw transactionsResult.error;

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
        totalBudget,
        totalActual,
        totalRemaining,
        rows,
    };
}

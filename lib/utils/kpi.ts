import type { Transaction, CategoryGL, Account, Budget, PersonalKPIs, BusinessKPIs } from "@/lib/types/finance";

// Personal KPI calculations
export function calculatePersonalKPIs(
    transactions: Transaction[],
    categories: CategoryGL[],
    accounts: Account[],
    budgets: Budget[],
    monthFilter?: string
): PersonalKPIs {
    const filtered = monthFilter
        ? transactions.filter((t) => t.date.startsWith(monthFilter))
        : transactions;

    const incomeCategories = new Set(categories.filter((c) => c.kind === "income").map((c) => c.id));
    const expenseCategories = new Set(categories.filter((c) => c.kind === "expense").map((c) => c.id));

    const totalIncome = filtered
        .filter((t) => t.category_gl_id && incomeCategories.has(t.category_gl_id))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalExpenses = filtered
        .filter((t) => t.category_gl_id && expenseCategories.has(t.category_gl_id))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

    // Net Worth
    const assetTypes = new Set(["cash", "bank", "investment"]);
    const liabilityTypes = new Set(["credit_card", "loan"]);
    const assets = accounts
        .filter((a) => assetTypes.has(a.account_type))
        .reduce((sum, a) => sum + a.opening_balance, 0);
    const liabilities = accounts
        .filter((a) => liabilityTypes.has(a.account_type))
        .reduce((sum, a) => sum + Math.abs(a.opening_balance), 0);
    const netWorth = assets - liabilities;

    // Emergency Fund
    const allExpenses = transactions.filter(
        (t) => t.category_gl_id && expenseCategories.has(t.category_gl_id)
    );
    const months = new Set(allExpenses.map((t) => t.date.substring(0, 7)));
    const avgMonthlyExpenses =
        months.size > 0
            ? allExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0) / months.size
            : 0;
    const liquidCash = accounts
        .filter((a) => a.account_type === "cash" || a.account_type === "bank")
        .reduce((sum, a) => sum + a.opening_balance, 0);
    const emergencyFundMonths = avgMonthlyExpenses > 0 ? liquidCash / avgMonthlyExpenses : 0;

    // Budget vs Actual
    const monthBudgets = monthFilter
        ? budgets.filter((b) => b.month === monthFilter)
        : budgets;
    const budgetUtilization = monthBudgets.map((b) => {
        const cat = categories.find((c) => c.id === b.category_gl_id);
        const actual = filtered
            .filter((t) => t.category_gl_id === b.category_gl_id)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return {
            category: cat?.name ?? "Unknown",
            budget: b.amount,
            actual,
            variance: actual - b.amount,
        };
    });

    return {
        netCashFlow,
        totalIncome,
        totalExpenses,
        savingsRate,
        netWorth,
        emergencyFundMonths,
        budgetUtilization,
    };
}

// Business KPI calculations
export function calculateBusinessKPIs(
    transactions: Transaction[],
    categories: CategoryGL[],
    budgets: Budget[],
    monthFilter?: string
): BusinessKPIs {
    const filtered = monthFilter
        ? transactions.filter((t) => t.date.startsWith(monthFilter))
        : transactions;

    const byKind = (kind: string) =>
        filtered
            .filter((t) => {
                const cat = categories.find((c) => c.id === t.category_gl_id);
                return cat?.kind === kind;
            })
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const revenue = byKind("revenue");
    const cogs = byKind("cogs");
    const grossProfit = revenue - cogs;

    const opexTransactions = filtered.filter((t) => {
        const cat = categories.find((c) => c.id === t.category_gl_id);
        return cat?.kind === "opex";
    });
    const opex = opexTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const fixedCosts = opexTransactions
        .filter((t) => {
            const cat = categories.find((c) => c.id === t.category_gl_id);
            return cat?.fixed_cost;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const variableCosts = opexTransactions
        .filter((t) => {
            const cat = categories.find((c) => c.id === t.category_gl_id);
            return cat?.variable_cost;
        })
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const operatingIncome = revenue - cogs - opex;
    const operatingMargin = revenue > 0 ? operatingIncome / revenue : 0;

    // Budget vs Actual
    const monthBudgets = monthFilter
        ? budgets.filter((b) => b.month === monthFilter)
        : budgets;
    const budgetVsActual = monthBudgets.map((b) => {
        const cat = categories.find((c) => c.id === b.category_gl_id);
        const actual = filtered
            .filter((t) => t.category_gl_id === b.category_gl_id)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const variance = actual - b.amount;
        const variancePct = b.amount > 0 ? variance / b.amount : 0;
        return {
            glAccount: cat?.name ?? "Unknown",
            budget: b.amount,
            actual,
            variance,
            variancePct,
        };
    });

    return {
        revenue,
        cogs,
        grossProfit,
        opex,
        fixedCosts,
        variableCosts,
        operatingIncome,
        operatingMargin,
        budgetVsActual,
        forecastRevenue: 0,
        forecastEBIT: 0,
    };
}

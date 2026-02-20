"use server";

import { getOrgContextOrNull } from "@/lib/server/context";

export interface DashboardKPIs {
    netWorth: number;
    cashFlow: number;
    savingsRate: number;
    emergencyFundMonths: number;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
    const context = await getOrgContextOrNull();
    if (!context) return { netWorth: 0, cashFlow: 0, savingsRate: 0, emergencyFundMonths: 0 };
    const { supabase, orgId } = context;

    // Calculate Net Worth (Sum of all account balances)
    const { data: accounts } = await supabase
        .from("accounts")
        .select("opening_balance, account_type")
        .eq("org_id", orgId);

    const netWorth = accounts?.reduce((sum, acc) => sum + Number(acc.opening_balance), 0) || 0;

    // Calculate Cash Flow (Income - Expenses this month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: transactions } = await supabase
        .from("transactions")
        .select(`
      amount,
      categories_gl!inner(kind)
    `)
        .eq("org_id", orgId)
        .gte("date", startOfMonth.toISOString());

    let income = 0;
    let expenses = 0;

    // Define strict type for query result without any
    interface TransactionKPIResult {
        amount: number;
        categories_gl: { kind: string } | { kind: string }[] | null;
    }

    // Cast the fetch result to known type for iteration
    const txns = transactions as unknown as TransactionKPIResult[] | null;

    txns?.forEach((txn) => {
        if (txn.amount > 0) income += txn.amount;
        else expenses += Math.abs(txn.amount);
    });

    const cashFlow = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    // Emergency Fund: Liquid Cash / Avg Expenses
    interface AccountWithBalance {
        opening_balance: number;
        account_type: string;
    }

    const relevantAccounts = accounts as unknown as AccountWithBalance[] | null;

    const liquidity = relevantAccounts?.filter((a) =>
        ['cash', 'bank'].includes(a.account_type)
    ).reduce((sum, a) => sum + Number(a.opening_balance), 0) || 0;

    const emergencyFundMonths = expenses > 0 ? liquidity / expenses : 0;

    return {
        netWorth,
        cashFlow,
        savingsRate,
        emergencyFundMonths
    };
}

export async function getRecentTransactions() {
    const context = await getOrgContextOrNull();
    if (!context) return [];
    const { supabase, orgId } = context;

    const { data } = await supabase
        .from("transactions")
        .select("*, accounts(name), categories_gl(name)")
        .eq("org_id", orgId)
        .order("date", { ascending: false })
        .limit(5);

    return data || [];
}

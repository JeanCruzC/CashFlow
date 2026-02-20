"use server";

import { getOrgContextOrNull } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";

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

    const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("opening_balance, account_type")
        .eq("org_id", orgId);
    if (accountsError) {
        logError("Error fetching accounts for dashboard", accountsError, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }

    const netWorth = accounts?.reduce((sum, acc) => sum + Number(acc.opening_balance), 0) || 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthIso = startOfMonth.toISOString().slice(0, 10);

    const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("org_id", orgId)
        .gte("date", startOfMonthIso);
    if (transactionsError) {
        logError("Error fetching transactions for dashboard", transactionsError, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }

    let income = 0;
    let expenses = 0;

    interface TransactionKPIResult {
        amount: number;
    }

    const txns = transactions as unknown as TransactionKPIResult[] | null;

    txns?.forEach((txn) => {
        if (txn.amount > 0) income += txn.amount;
        else expenses += Math.abs(txn.amount);
    });

    const cashFlow = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

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

    const { data, error } = await supabase
        .from("transactions")
        .select("*, accounts(name), categories_gl(name)")
        .eq("org_id", orgId)
        .order("date", { ascending: false })
        .limit(5);
    if (error) {
        logError("Error fetching recent transactions", error, { orgId });
        return [];
    }

    return data || [];
}

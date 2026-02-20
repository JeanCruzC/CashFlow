import { describe, expect, it } from "vitest";
import { calculateBusinessKPIs, calculatePersonalKPIs } from "@/lib/utils/kpi";
import { Account, Budget, CategoryGL, Transaction } from "@/lib/types/finance";

function tx(overrides: Partial<Transaction>): Transaction {
    return {
        id: "tx-id",
        org_id: "org-1",
        date: "2026-02-10",
        description: "Test",
        document_type: null,
        document_number: null,
        account_id: "acc-1",
        category_gl_id: null,
        counterparty_id: null,
        cost_center_id: null,
        project_id: null,
        amount: 0,
        currency: "USD",
        tax_amount: null,
        is_transfer: false,
        transfer_group_id: null,
        detraccion_rate: null,
        detraccion_amount: null,
        status: "confirmed",
        attachment_url: null,
        import_batch_id: null,
        external_id: null,
        notes: null,
        created_by: "user-1",
        created_at: "2026-02-10T00:00:00.000Z",
        updated_at: "2026-02-10T00:00:00.000Z",
        ...overrides,
    };
}

describe("calculatePersonalKPIs", () => {
    it("calculates core personal metrics from categories and transactions", () => {
        const categories: CategoryGL[] = [
            {
                id: "cat-income",
                org_id: "org-1",
                name: "Salary",
                kind: "income",
                fixed_cost: false,
                variable_cost: false,
                is_active: true,
                sort_order: 1,
                created_at: "2026-02-01T00:00:00.000Z",
            },
            {
                id: "cat-expense",
                org_id: "org-1",
                name: "Rent",
                kind: "expense",
                fixed_cost: true,
                variable_cost: false,
                is_active: true,
                sort_order: 2,
                created_at: "2026-02-01T00:00:00.000Z",
            },
        ];

        const transactions: Transaction[] = [
            tx({ id: "1", amount: 5000, category_gl_id: "cat-income", date: "2026-02-02" }),
            tx({ id: "2", amount: -2000, category_gl_id: "cat-expense", date: "2026-02-04" }),
        ];

        const accounts: Account[] = [
            {
                id: "a1",
                org_id: "org-1",
                name: "Cash",
                account_type: "cash",
                currency: "USD",
                opening_balance: 10000,
                credit_limit: null,
                interest_rate_apr: null,
                is_restricted_cash: false,
                is_active: true,
                created_at: "2026-02-01T00:00:00.000Z",
            },
            {
                id: "a2",
                org_id: "org-1",
                name: "Card",
                account_type: "credit_card",
                currency: "USD",
                opening_balance: -2500,
                credit_limit: null,
                interest_rate_apr: null,
                is_restricted_cash: false,
                is_active: true,
                created_at: "2026-02-01T00:00:00.000Z",
            },
        ];

        const budgets: Budget[] = [
            {
                id: "b1",
                org_id: "org-1",
                month: "2026-02",
                category_gl_id: "cat-expense",
                cost_center_id: null,
                amount: 3000,
                created_at: "2026-02-01T00:00:00.000Z",
            },
        ];

        const result = calculatePersonalKPIs(transactions, categories, accounts, budgets, "2026-02");

        expect(result.totalIncome).toBe(5000);
        expect(result.totalExpenses).toBe(2000);
        expect(result.netCashFlow).toBe(3000);
        expect(result.savingsRate).toBeCloseTo(0.6, 5);
        expect(result.netWorth).toBe(7500);
        expect(result.budgetUtilization[0].variance).toBe(-1000);
    });
});

describe("calculateBusinessKPIs", () => {
    it("calculates operating metrics for business categories", () => {
        const categories: CategoryGL[] = [
            {
                id: "revenue",
                org_id: "org-1",
                name: "Revenue",
                kind: "revenue",
                fixed_cost: false,
                variable_cost: false,
                is_active: true,
                sort_order: 1,
                created_at: "2026-02-01T00:00:00.000Z",
            },
            {
                id: "cogs",
                org_id: "org-1",
                name: "COGS",
                kind: "cogs",
                fixed_cost: false,
                variable_cost: true,
                is_active: true,
                sort_order: 2,
                created_at: "2026-02-01T00:00:00.000Z",
            },
            {
                id: "opex",
                org_id: "org-1",
                name: "OPEX",
                kind: "opex",
                fixed_cost: true,
                variable_cost: false,
                is_active: true,
                sort_order: 3,
                created_at: "2026-02-01T00:00:00.000Z",
            },
        ];

        const transactions: Transaction[] = [
            tx({ id: "r1", amount: 10000, category_gl_id: "revenue", date: "2026-02-01" }),
            tx({ id: "c1", amount: -4000, category_gl_id: "cogs", date: "2026-02-02" }),
            tx({ id: "o1", amount: -2000, category_gl_id: "opex", date: "2026-02-03" }),
        ];

        const result = calculateBusinessKPIs(transactions, categories, [], "2026-02");

        expect(result.revenue).toBe(10000);
        expect(result.cogs).toBe(4000);
        expect(result.grossProfit).toBe(6000);
        expect(result.opex).toBe(2000);
        expect(result.operatingIncome).toBe(4000);
        expect(result.operatingMargin).toBeCloseTo(0.4, 5);
    });
});

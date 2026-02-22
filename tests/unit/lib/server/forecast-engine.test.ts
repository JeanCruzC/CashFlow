import { describe, expect, it } from "vitest";
import { computeBusinessForecast } from "@/lib/server/forecast-engine";
import type { CategoryGL, Transaction } from "@/lib/types/finance";

const categories: Array<Pick<CategoryGL, "id" | "kind" | "fixed_cost" | "variable_cost">> = [
    { id: "rev", kind: "revenue", fixed_cost: false, variable_cost: false },
    { id: "cogs", kind: "cogs", fixed_cost: false, variable_cost: true },
    { id: "opex-fixed", kind: "opex", fixed_cost: true, variable_cost: false },
    { id: "opex-var", kind: "opex", fixed_cost: false, variable_cost: true },
];

function monthShift(month: string, delta: number) {
    const [year, monthValue] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, monthValue - 1, 1));
    date.setUTCMonth(date.getUTCMonth() + delta);
    const nextYear = date.getUTCFullYear();
    const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${nextYear}-${nextMonth}`;
}

function buildTransaction(date: string, categoryId: string, amount: number): Pick<Transaction, "date" | "amount" | "category_gl_id"> {
    return {
        date,
        amount,
        category_gl_id: categoryId,
    };
}

function buildHistoryTransactions(startMonth: string, months: number) {
    const rows: Array<Pick<Transaction, "date" | "amount" | "category_gl_id">> = [];
    for (let index = 0; index < months; index += 1) {
        const month = monthShift(startMonth, index);
        const seasonal = index % 12 < 6 ? 1.06 : 0.94;
        const revenue = (18000 + index * 450) * seasonal;
        const cogs = revenue * 0.4;
        const fixedOpex = 4200;
        const variableOpex = revenue * 0.12;

        rows.push(buildTransaction(`${month}-10`, "rev", revenue));
        rows.push(buildTransaction(`${month}-11`, "cogs", -cogs));
        rows.push(buildTransaction(`${month}-12`, "opex-fixed", -fixedOpex));
        rows.push(buildTransaction(`${month}-13`, "opex-var", -variableOpex));
    }
    return rows;
}

describe("computeBusinessForecast", () => {
    it("generates forecast with statistical model when history is enough", () => {
        const transactions = buildHistoryTransactions("2024-01", 24);
        const result = computeBusinessForecast({
            targetMonth: "2026-01",
            horizonMonths: 6,
            categories,
            transactions,
        });

        expect(result.projections).toHaveLength(6);
        expect(result.model.selected_model).not.toBe("manual_assumptions");
        expect(result.history.history_months_with_data).toBeGreaterThanOrEqual(20);
        expect(result.drivers.cogs_percent).toBeGreaterThan(30);
        expect(result.drivers.cogs_percent).toBeLessThan(50);
        expect(result.projections[0].revenue).toBeGreaterThan(0);
    });

    it("applies manual assumptions as overrides over model output", () => {
        const transactions = buildHistoryTransactions("2024-01", 24);
        const result = computeBusinessForecast({
            targetMonth: "2026-01",
            horizonMonths: 3,
            categories,
            transactions,
            assumptions: {
                revenue_amount: 50000,
                revenue_growth_rate: 5,
                cogs_percent: 35,
                fixed_opex: 9000,
                variable_opex_percent: 8,
                one_off_amount: 1200,
            },
        });

        expect(result.projections[0].revenue).toBeCloseTo(50000, 5);
        expect(result.projections[1].revenue).toBeCloseTo(52500, 5);
        expect(result.projections[0].cogs).toBeCloseTo(17500, 5);
        expect(result.projections[0].opex).toBeCloseTo(14200, 5);
    });

    it("falls back to manual assumptions model on sparse history", () => {
        const sparseTransactions = buildHistoryTransactions("2025-11", 2);
        const result = computeBusinessForecast({
            targetMonth: "2026-01",
            horizonMonths: 3,
            categories,
            transactions: sparseTransactions,
        });

        expect(result.model.selected_model).toBe("manual_assumptions");
        expect(result.projections).toHaveLength(3);
    });
});

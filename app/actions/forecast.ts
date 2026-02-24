"use server";

import { revalidatePath } from "next/cache";
import { forecastSchema, ForecastInput } from "@/lib/validations/schemas";
import { getOrgContextOrNull, requireOrgActorContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";
import {
    computeBusinessForecast,
    ForecastDriverBundle,
    ForecastModelDiagnostics,
    ForecastProjection,
} from "@/lib/server/forecast-engine";
import type { CategoryGL, Transaction } from "@/lib/types/finance";

function resolveMonth(month?: string) {
    if (month && /^\d{4}-\d{2}$/.test(month)) return month;
    return new Date().toISOString().slice(0, 7);
}

function resolveHorizon(horizon?: number) {
    return [3, 6, 12].includes(Number(horizon)) ? Number(horizon) : 6;
}

function monthToDateStart(month: string) {
    return `${month}-01`;
}

function monthShift(month: string, delta: number) {
    const [year, monthValue] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, monthValue - 1, 1));
    date.setUTCMonth(date.getUTCMonth() + delta);
    const nextYear = date.getUTCFullYear();
    const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${nextYear}-${nextMonth}`;
}

export interface ForecastOverview {
    month: string;
    currency: string;
    horizon_months: number;
    revenue_growth_rate: number | null;
    revenue_amount: number | null;
    cogs_percent: number | null;
    fixed_opex: number | null;
    variable_opex_percent: number | null;
    one_off_amount: number | null;
    note: string | null;
    model: ForecastModelDiagnostics;
    drivers: ForecastDriverBundle;
    projections: ForecastProjection[];
    items_used: string[];
    history: {
        history_start_month: string;
        history_end_month: string;
        history_months_total: number;
        history_months_with_data: number;
    };
}

function emptyForecast(month: string, horizonMonths: number, currency = "USD"): ForecastOverview {
    return {
        month,
        currency,
        horizon_months: horizonMonths,
        revenue_growth_rate: null,
        revenue_amount: null,
        cogs_percent: null,
        fixed_opex: null,
        variable_opex_percent: null,
        one_off_amount: null,
        note: null,
        model: {
            selected_model: "manual_assumptions",
            validation_mape_pct: null,
            history_months: 0,
            horizon_months: horizonMonths,
            reason: "No existe organización activa o datos suficientes para proyectar.",
            candidates: [
                {
                    model: "manual_assumptions",
                    mape_pct: null,
                    status: "used",
                },
            ],
        },
        drivers: {
            cogs_percent: 0,
            fixed_opex: 0,
            variable_opex_percent: 0,
            one_off_amount: 0,
            sources: {
                cogs_percent: "historical",
                fixed_opex: "historical",
                variable_opex_percent: "historical",
                one_off_amount: "default_zero",
            },
        },
        projections: [],
        items_used: [],
        history: {
            history_start_month: monthShift(month, -36),
            history_end_month: monthShift(month, -1),
            history_months_total: 36,
            history_months_with_data: 0,
        },
    };
}

export async function getForecastOverview(month?: string, horizon?: number): Promise<ForecastOverview> {
    const targetMonth = resolveMonth(month);
    const horizonMonths = resolveHorizon(horizon);
    const context = await getOrgContextOrNull();
    if (!context) return emptyForecast(targetMonth, horizonMonths, "USD");

    const { supabase, orgId } = context;
    const historyStartMonth = monthShift(targetMonth, -36);

    const [orgResult, assumptionsResult, categoriesResult, transactionsResult] = await Promise.all([
        supabase.from("orgs").select("type, currency").eq("id", orgId).maybeSingle(),
        supabase
            .from("forecast_assumptions")
            .select("*")
            .eq("org_id", orgId)
            .eq("month", targetMonth)
            .maybeSingle(),
        supabase
            .from("categories_gl")
            .select("id, kind, fixed_cost, variable_cost")
            .eq("org_id", orgId)
            .eq("is_active", true),
        supabase
            .from("transactions")
            .select("date, amount, category_gl_id")
            .eq("org_id", orgId)
            .gte("date", monthToDateStart(historyStartMonth))
            .lt("date", monthToDateStart(targetMonth)),
    ]);

    if (orgResult.error || !orgResult.data) {
        logError("Error fetching org type for forecast", orgResult.error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el pronóstico");
    }
    const orgCurrency = orgResult.data.currency || "USD";

    if (assumptionsResult.error) {
        logError("Error fetching forecast assumptions", assumptionsResult.error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el pronóstico");
    }
    if (categoriesResult.error) {
        logError("Error fetching categories for forecast", categoriesResult.error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el pronóstico");
    }
    if (transactionsResult.error) {
        logError("Error fetching transactions for forecast", transactionsResult.error, { orgId, month: targetMonth });
        throw new Error("No se pudo cargar el pronóstico");
    }

    if (orgResult.data.type !== "business") {
        // ── PERSONAL FORECAST: simplified cashflow projection ──
        const txns = (transactionsResult.data ?? []) as Array<{ date: string; amount: number; category_gl_id: string | null }>;
        const cats = (categoriesResult.data ?? []) as Pick<CategoryGL, "id" | "kind">[];

        const incomeKinds = new Set(["income", "other_income"]);
        const incomeCatIds = new Set(cats.filter(c => incomeKinds.has(c.kind)).map(c => c.id));

        // Group by month
        const monthlyData = new Map<string, { income: number; expenses: number }>();
        for (const tx of txns) {
            const m = tx.date.slice(0, 7);
            const entry = monthlyData.get(m) || { income: 0, expenses: 0 };
            if (incomeCatIds.has(tx.category_gl_id || "") || tx.amount > 0) {
                entry.income += Math.abs(Number(tx.amount));
            } else {
                entry.expenses += Math.abs(Number(tx.amount));
            }
            monthlyData.set(m, entry);
        }

        const monthsWithData = monthlyData.size;
        const totalIncome = Array.from(monthlyData.values()).reduce((s, v) => s + v.income, 0);
        const totalExpenses = Array.from(monthlyData.values()).reduce((s, v) => s + v.expenses, 0);
        const avgIncome = monthsWithData > 0 ? totalIncome / monthsWithData : 0;
        const avgExpenses = monthsWithData > 0 ? totalExpenses / monthsWithData : 0;
        const avgNet = avgIncome - avgExpenses;

        // Fetch current liquid balance
        const { data: accountsData } = await supabase
            .from("accounts")
            .select("opening_balance")
            .eq("org_id", orgId);

        const currentBalance = (accountsData || []).reduce((s: number, a: { opening_balance: number | string | null }) => s + Number(a.opening_balance || 0), 0)
            + txns.reduce((s, t) => s + Number(t.amount), 0);

        // Build projections
        const personalProjections: ForecastProjection[] = [];
        let runningBalance = currentBalance;
        for (let i = 1; i <= horizonMonths; i++) {
            runningBalance += avgNet;
            const m = monthShift(targetMonth, i);
            personalProjections.push({
                month: m,
                revenue: avgIncome,
                cogs: 0,
                opex: avgExpenses,
                ebit: avgNet,
                operating_margin_pct: avgIncome > 0 ? (avgNet / avgIncome) * 100 : 0,
            });
        }

        return {
            ...emptyForecast(targetMonth, horizonMonths, orgCurrency),
            model: {
                selected_model: "personal_average",
                validation_mape_pct: null,
                history_months: monthsWithData,
                horizon_months: horizonMonths,
                reason: monthsWithData >= 2
                    ? `Proyección basada en promedios de ${monthsWithData} meses de historial real.`
                    : "Necesitas al menos 2 meses de transacciones para una proyección precisa.",
                candidates: [{ model: "personal_average", mape_pct: null, status: "used" as const }],
            },
            drivers: {
                cogs_percent: 0,
                fixed_opex: avgExpenses,
                variable_opex_percent: 0,
                one_off_amount: 0,
                sources: {
                    cogs_percent: "historical",
                    fixed_opex: "historical",
                    variable_opex_percent: "historical",
                    one_off_amount: "default_zero",
                },
            },
            projections: personalProjections,
            items_used: [
                `Ingreso promedio mensual: ${avgIncome.toFixed(2)}`,
                `Gasto promedio mensual: ${avgExpenses.toFixed(2)}`,
                `Flujo neto promedio: ${avgNet.toFixed(2)}`,
                `Saldo actual: ${currentBalance.toFixed(2)}`,
                `Saldo proyectado (${horizonMonths}m): ${runningBalance.toFixed(2)}`,
            ],
            history: {
                history_start_month: historyStartMonth,
                history_end_month: monthShift(targetMonth, -1),
                history_months_total: 36,
                history_months_with_data: monthsWithData,
            },
            note: "Pronóstico personal basado en tu historial de ingresos y gastos.",
        };
    }

    const categories = (categoriesResult.data ?? []) as Pick<CategoryGL, "id" | "kind" | "fixed_cost" | "variable_cost">[];
    const transactions = (transactionsResult.data ?? []) as Pick<Transaction, "date" | "amount" | "category_gl_id">[];
    const assumptionData = assumptionsResult.data;

    const computed = computeBusinessForecast({
        targetMonth,
        horizonMonths,
        categories,
        transactions,
        assumptions: {
            revenue_growth_rate: assumptionData?.revenue_growth_rate ?? null,
            revenue_amount: assumptionData?.revenue_amount ?? null,
            cogs_percent: assumptionData?.cogs_percent ?? null,
            fixed_opex: assumptionData?.fixed_opex ?? null,
            variable_opex_percent: assumptionData?.variable_opex_percent ?? null,
            one_off_amount: assumptionData?.one_off_amount ?? null,
        },
    });

    return {
        month: targetMonth,
        currency: orgCurrency,
        horizon_months: horizonMonths,
        revenue_growth_rate: assumptionData?.revenue_growth_rate ?? null,
        revenue_amount: assumptionData?.revenue_amount ?? null,
        cogs_percent: assumptionData?.cogs_percent ?? null,
        fixed_opex: assumptionData?.fixed_opex ?? null,
        variable_opex_percent: assumptionData?.variable_opex_percent ?? null,
        one_off_amount: assumptionData?.one_off_amount ?? null,
        note: assumptionData?.note ?? null,
        model: computed.model,
        drivers: computed.drivers,
        projections: computed.projections,
        items_used: computed.items_used,
        history: computed.history,
    };
}

export async function upsertForecastAssumption(input: ForecastInput) {
    const validation = forecastSchema.safeParse(input);
    if (!validation.success) return { error: validation.error.message };

    const { supabase, orgId, user } = await requireOrgActorContext();

    try {
        assertRateLimit({
            key: `upsert-forecast:${user.id}`,
            limit: 30,
            windowMs: 60_000,
        });
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Límite de solicitudes excedido" };
    }

    const payload = validation.data;
    const { error } = await supabase
        .from("forecast_assumptions")
        .upsert(
            {
                org_id: orgId,
                month: payload.month,
                revenue_growth_rate: payload.revenue_growth_rate ?? null,
                revenue_amount: payload.revenue_amount ?? null,
                cogs_percent: payload.cogs_percent ?? null,
                fixed_opex: payload.fixed_opex ?? null,
                variable_opex_percent: payload.variable_opex_percent ?? null,
                one_off_amount: payload.one_off_amount ?? null,
                note: payload.note ?? null,
            },
            { onConflict: "org_id,month" }
        );

    if (error) {
        logError("Error upserting forecast assumptions", error, { orgId, userId: user.id, month: payload.month });
        return { error: "No se pudo guardar el pronóstico" };
    }

    revalidatePath("/dashboard/forecast");
    revalidatePath("/dashboard");
    return { success: true };
}

"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { assertRateLimit } from "./rate-limit";
import { logError } from "./logger";
import { requireUserContext } from "./context";
import { getGoogleAiProvider } from "./google-ai";

const goalInputSchema = z.object({
    id: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(120),
    targetAmount: z.number().finite().min(0),
    currentAmount: z.number().finite().min(0),
    projectedMonthlyContribution: z.number().finite().min(0),
    targetMonths: z.number().int().min(3).max(240),
    suggestedMonths: z.number().int().min(3).max(240).optional(),
});

const incomeGapInputSchema = z.object({
    country: z.string().trim().min(2).max(2),
    currency: z.string().trim().length(3),
    consolidatedIncome: z.number().finite().min(0),
    operationalCashRequired: z.number().finite().min(0),
    estimatedDebtPayment: z.number().finite().min(0),
    currentDistribution: z.object({
        needsPct: z.number().finite().min(0).max(100),
        wantsPct: z.number().finite().min(0).max(100),
        savingsPct: z.number().finite().min(0).max(100),
        debtPct: z.number().finite().min(0).max(100),
    }),
    goals: z.array(goalInputSchema).max(30),
});

const aiNarrativeSchema = z.object({
    summary: z.string().min(40).max(1500),
    action_items: z.array(z.string().min(8).max(220)).min(3).max(5),
});

type IncomeGapInput = z.infer<typeof incomeGapInputSchema>;

export interface IncomeGapGoalResult {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_months: number;
    suggested_months: number;
    projected_monthly_contribution: number;
    required_monthly_contribution: number;
    gap_monthly_contribution: number;
}

export interface IncomeGapRecommendationResult {
    generated_at: string;
    source_model: "gemini" | "deterministic";
    country: string;
    currency: string;
    consolidated_income: number;
    recommended_income: number;
    additional_income_needed: number;
    operational_commitment: number;
    required_debt_payment: number;
    required_savings_for_goals: number;
    healthy_plan_pct: {
        needs_pct: number;
        wants_pct: number;
        savings_pct: number;
        debt_pct: number;
    };
    healthy_plan_amounts: {
        needs_amount: number;
        wants_amount: number;
        savings_amount: number;
        debt_amount: number;
    };
    goals: IncomeGapGoalResult[];
    summary: string;
    action_items: string[];
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function percentOf(amount: number, total: number) {
    if (total <= 0) return 0;
    return round2((Math.max(amount, 0) / total) * 100);
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function buildDeterministicRecommendation(input: IncomeGapInput): IncomeGapRecommendationResult {
    const hasDebt = input.estimatedDebtPayment > 0;

    const goalResults: IncomeGapGoalResult[] = input.goals.map((goal) => {
        const remaining = round2(Math.max(goal.targetAmount - goal.currentAmount, 0));
        const requiredMonthly = round2(goal.targetMonths > 0 ? remaining / goal.targetMonths : 0);
        const gap = round2(
            Math.max(requiredMonthly - goal.projectedMonthlyContribution, 0)
        );

        return {
            id: goal.id,
            name: goal.name,
            target_amount: goal.targetAmount,
            current_amount: goal.currentAmount,
            target_months: goal.targetMonths,
            suggested_months: goal.suggestedMonths ?? goal.targetMonths,
            projected_monthly_contribution: goal.projectedMonthlyContribution,
            required_monthly_contribution: requiredMonthly,
            gap_monthly_contribution: gap,
        };
    });

    const requiredSavingsForGoals = round2(
        goalResults.reduce((sum, goal) => sum + goal.required_monthly_contribution, 0)
    );

    const wantsPct = clamp(
        Math.max(input.currentDistribution.wantsPct, hasDebt ? 8 : 12),
        8,
        25
    );
    const minSavingsPct = clamp(
        Math.max(input.currentDistribution.savingsPct, hasDebt ? 12 : 15),
        10,
        35
    );
    const debtPctTarget = hasDebt
        ? clamp(Math.max(input.currentDistribution.debtPct, 5), 5, 20)
        : 0;

    const commitmentBase = round2(
        input.operationalCashRequired + input.estimatedDebtPayment
    );

    const denominatorAbsoluteSavings = 1 - wantsPct / 100;
    const incomeToCoverAbsoluteSavings =
        denominatorAbsoluteSavings > 0
            ? round2(
                (commitmentBase + requiredSavingsForGoals) /
                denominatorAbsoluteSavings
            )
            : Number.POSITIVE_INFINITY;

    const denominatorHealthyMix = 1 - (wantsPct + minSavingsPct) / 100;
    const incomeToRespectHealthyMix =
        denominatorHealthyMix > 0
            ? round2(commitmentBase / denominatorHealthyMix)
            : Number.POSITIVE_INFINITY;

    const incomeToCoverDebtMix =
        hasDebt && debtPctTarget > 0
            ? round2(input.estimatedDebtPayment / (debtPctTarget / 100))
            : input.consolidatedIncome;

    let recommendedIncome = round2(
        Math.max(
            input.consolidatedIncome,
            incomeToCoverAbsoluteSavings,
            incomeToRespectHealthyMix,
            incomeToCoverDebtMix
        )
    );

    const needsAmount = round2(input.operationalCashRequired);
    const debtAmount = round2(input.estimatedDebtPayment);
    let wantsAmount = round2((recommendedIncome * wantsPct) / 100);
    let savingsAmount = round2(
        recommendedIncome - needsAmount - debtAmount - wantsAmount
    );

    const minimumSavingsAmount = round2(
        Math.max(requiredSavingsForGoals, (recommendedIncome * minSavingsPct) / 100)
    );

    if (savingsAmount < minimumSavingsAmount) {
        const shortfall = round2(minimumSavingsAmount - savingsAmount);
        recommendedIncome = round2(recommendedIncome + shortfall);
        wantsAmount = round2((recommendedIncome * wantsPct) / 100);
        savingsAmount = round2(
            recommendedIncome - needsAmount - debtAmount - wantsAmount
        );
    }

    if (savingsAmount < 0) {
        recommendedIncome = round2(recommendedIncome + Math.abs(savingsAmount));
        wantsAmount = round2((recommendedIncome * wantsPct) / 100);
        savingsAmount = round2(
            recommendedIncome - needsAmount - debtAmount - wantsAmount
        );
    }

    const healthyPlanAmounts = {
        needs_amount: needsAmount,
        wants_amount: round2(Math.max(wantsAmount, 0)),
        savings_amount: round2(Math.max(savingsAmount, 0)),
        debt_amount: round2(Math.max(debtAmount, 0)),
    };

    const healthyPlanPct = {
        needs_pct: percentOf(healthyPlanAmounts.needs_amount, recommendedIncome),
        wants_pct: percentOf(healthyPlanAmounts.wants_amount, recommendedIncome),
        savings_pct: percentOf(healthyPlanAmounts.savings_amount, recommendedIncome),
        debt_pct: percentOf(healthyPlanAmounts.debt_amount, recommendedIncome),
    };

    const additionalIncomeNeeded = round2(
        Math.max(recommendedIncome - input.consolidatedIncome, 0)
    );
    const highGap = additionalIncomeNeeded > input.consolidatedIncome * 0.6;

    const summary = additionalIncomeNeeded > 0
        ? highGap
            ? `La brecha para cumplir el plazo elegido es alta: necesitas ${input.currency} ${additionalIncomeNeeded.toFixed(2)} adicionales al mes. Te recomendamos un plan escalonado: definir un ingreso adicional alcanzable e ir extendiendo el horizonte de metas.`
            : `Para sostener una distribución saludable y cumplir tus metas en el plazo elegido, necesitas elevar tu ingreso mensual en ${input.currency} ${additionalIncomeNeeded.toFixed(2)}.`
        : `Con tu ingreso actual puedes sostener una distribución saludable y cumplir tus metas en el plazo elegido sin ingreso adicional.`;

    const actionItems = additionalIncomeNeeded > 0
        ? [
            "Define un ingreso adicional alcanzable y úsalo como escenario base antes de comprometer un objetivo agresivo.",
            "Mantén cubiertos compromisos operativos y de deuda antes de aumentar gastos discrecionales.",
            "Si el ingreso adicional es limitado, prioriza metas y amplía el horizonte para evitar sobreendeudamiento.",
        ]
        : [
            "Mantén la consistencia de tu aporte mensual a metas y evita retiros del bucket de ahorro.",
            "Revisa trimestralmente gastos fijos para liberar margen adicional sin comprometer la cobertura.",
            "Usa ingresos extraordinarios para acelerar metas o reducir deuda revolvente.",
        ];

    return {
        generated_at: new Date().toISOString(),
        source_model: "deterministic",
        country: input.country,
        currency: input.currency,
        consolidated_income: input.consolidatedIncome,
        recommended_income: recommendedIncome,
        additional_income_needed: additionalIncomeNeeded,
        operational_commitment: input.operationalCashRequired,
        required_debt_payment: input.estimatedDebtPayment,
        required_savings_for_goals: requiredSavingsForGoals,
        healthy_plan_pct: healthyPlanPct,
        healthy_plan_amounts: healthyPlanAmounts,
        goals: goalResults,
        summary,
        action_items: actionItems,
    };
}

export async function generateIncomeGapRecommendation(rawInput: IncomeGapInput) {
    try {
        const parsed = incomeGapInputSchema.safeParse(rawInput);
        if (!parsed.success) {
            return { success: false, error: "Los datos de recomendación son inválidos." as const };
        }

        const input = parsed.data;
        const { user } = await requireUserContext();
        assertRateLimit({
            key: `onboarding-ai-income-gap:${user.id}`,
            limit: 20,
            windowMs: 60_000,
        });

        const deterministic = buildDeterministicRecommendation(input);
        const google = getGoogleAiProvider();
        if (!google) {
            return { success: true, data: deterministic };
        }

        const modelCandidates = [
            process.env.GEMINI_DISTRIBUTION_MODEL,
            "gemini-2.5-flash",
            "gemini-1.5-pro",
        ].filter(Boolean) as string[];

        for (const modelName of modelCandidates) {
            try {
                const aiResult = await generateObject({
                    model: google(modelName),
                    schema: aiNarrativeSchema,
                    system: `Eres un asesor financiero de CashFlow. Debes explicar de forma clara cuánto ingreso adicional mensual se requiere para mantener una estructura saludable (necesidades/deseos/ahorro/deuda) y cumplir metas de ahorro en el horizonte definido. Si una meta supera 12 meses, expresa el plazo en años y meses.`,
                    prompt: `
Moneda: ${input.currency}
Ingreso actual: ${deterministic.consolidated_income}
Ingreso recomendado: ${deterministic.recommended_income}
Ingreso adicional requerido: ${deterministic.additional_income_needed}
Compromisos operativos: ${deterministic.operational_commitment}
Pago mínimo de deuda revolvente: ${deterministic.required_debt_payment}
Ahorro mensual requerido para metas: ${deterministic.required_savings_for_goals}
Plan saludable (%): Needs ${deterministic.healthy_plan_pct.needs_pct}, Wants ${deterministic.healthy_plan_pct.wants_pct}, Savings ${deterministic.healthy_plan_pct.savings_pct}, Debt ${deterministic.healthy_plan_pct.debt_pct}
Detalle metas: ${JSON.stringify(deterministic.goals)}

Genera:
1) summary en español (1 párrafo claro, sin relleno). Si la brecha es alta, sugiere explícitamente estrategia escalonada con ingreso adicional alcanzable.
2) action_items con 3 a 5 acciones concretas y accionables.
                    `,
                });

                return {
                    success: true,
                    data: {
                        ...deterministic,
                        source_model: "gemini" as const,
                        summary: aiResult.object.summary,
                        action_items: aiResult.object.action_items,
                    },
                };
            } catch {
                continue;
            }
        }

        return { success: true, data: deterministic };
    } catch (error) {
        logError("Error generating income gap recommendation", error);
        if (error instanceof Error && error.message === "No autorizado") {
            return { success: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." as const };
        }
        if (error instanceof Error && error.message.startsWith("Demasiadas solicitudes")) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "No se pudo generar la recomendación IA en este momento." as const };
    }
}

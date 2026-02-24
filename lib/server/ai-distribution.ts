"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { logError } from "./logger";
import { requireUserContext } from "./context";
import { assertRateLimit } from "./rate-limit";
import { requireGoogleAiProvider } from "./google-ai";

const distributionSchema = z.object({
    needs: z.number().min(0).max(100),
    wants: z.number().min(0).max(100),
    savings: z.number().min(0).max(100),
    debt: z.number().min(0).max(100),
    reasoning: z.string(),
});

type DistributionInput = {
    country: string;
    currency: string;
    consolidatedIncome: number;
    fixedExpensesBudget: number;
    variableExpensesBudget: number;
    estimatedDebtPayment: number;
    fullPaymentCardsCashOutflow: number;
    creditCards: Array<{
        name: string;
        currentBalance: number;
        minimumPaymentAmount: number;
        paymentStrategy?: "full" | "minimum" | "fixed";
        tea?: number;
    }>;
    savingsGoals: Array<{
        name: string;
        targetAmount: number;
    }>;
};

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function normalizeDistribution(object: z.infer<typeof distributionSchema>) {
    const rawValues = [
        Math.max(object.needs, 0),
        Math.max(object.wants, 0),
        Math.max(object.savings, 0),
        Math.max(object.debt, 0),
    ];
    const total = rawValues.reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
        throw new Error("La IA devolvió una distribución inválida");
    }

    const scaled = rawValues.map((value) => round2((value / total) * 100));
    const scaledTotal = round2(scaled.reduce((sum, value) => sum + value, 0));
    const correction = round2(100 - scaledTotal);
    scaled[0] = round2(scaled[0] + correction);

    return {
        needs: scaled[0],
        wants: scaled[1],
        savings: scaled[2],
        debt: scaled[3],
        reasoning: object.reasoning,
    };
}

function toPercent(amount: number, income: number) {
    if (income <= 0) return 0;
    return round2((Math.max(amount, 0) / income) * 100);
}

function applyMinimumCoverageConstraints(
    normalized: ReturnType<typeof normalizeDistribution>,
    input: DistributionInput
) {
    const safeIncome = Math.max(input.consolidatedIncome, 0);
    if (safeIncome <= 0) return normalized;

    const operationalCashRequired = round2(
        input.fixedExpensesBudget +
        input.variableExpensesBudget +
        input.fullPaymentCardsCashOutflow
    );
    const requiredNeedsPct = Math.min(
        toPercent(operationalCashRequired, safeIncome),
        100
    );
    const requiredDebtPct = Math.min(
        toPercent(input.estimatedDebtPayment, safeIncome),
        100
    );

    let needs = normalized.needs;
    let wants = normalized.wants;
    let savings = normalized.savings;
    let debt = normalized.debt;

    const totalRequired = requiredNeedsPct + requiredDebtPct;
    if (totalRequired >= 100) {
        // El flujo está totalmente comprometido: priorizamos cobertura operativa + deuda mínima.
        debt = Math.min(requiredDebtPct, 100);
        needs = Math.max(100 - debt, 0);
        wants = 0;
        savings = 0;
        return {
            ...normalized,
            needs: round2(needs),
            wants: round2(wants),
            savings: round2(savings),
            debt: round2(debt),
        };
    }

    // 1) Garantizar bucket de deuda para cubrir mínimo revolvente.
    if (debt < requiredDebtPct) {
        let missingDebt = round2(requiredDebtPct - debt);

        const fromWants = Math.min(wants, missingDebt);
        wants = round2(wants - fromWants);
        missingDebt = round2(missingDebt - fromWants);

        if (missingDebt > 0) {
            const fromSavings = Math.min(savings, missingDebt);
            savings = round2(savings - fromSavings);
            missingDebt = round2(missingDebt - fromSavings);
        }

        if (missingDebt > 0) {
            const fromNeeds = Math.min(needs, missingDebt);
            needs = round2(needs - fromNeeds);
            missingDebt = round2(missingDebt - fromNeeds);
        }

        const coveredDebt = round2(requiredDebtPct - missingDebt);
        debt = Math.max(debt, coveredDebt);
    }

    // 2) Garantizar que NEEDS cubra completamente lo obligatorio:
    // gastos fijos + variables + pago total de tarjetas "full".
    if (needs < requiredNeedsPct) {
        let missingNeeds = round2(requiredNeedsPct - needs);

        const fromWants = Math.min(wants, missingNeeds);
        wants = round2(wants - fromWants);
        needs = round2(needs + fromWants);
        missingNeeds = round2(missingNeeds - fromWants);

        if (missingNeeds > 0) {
            const fromSavings = Math.min(savings, missingNeeds);
            savings = round2(savings - fromSavings);
            needs = round2(needs + fromSavings);
            missingNeeds = round2(missingNeeds - fromSavings);
        }

        if (missingNeeds > 0) {
            const debtSurplus = Math.max(debt - requiredDebtPct, 0);
            const fromDebtSurplus = Math.min(debtSurplus, missingNeeds);
            debt = round2(debt - fromDebtSurplus);
            needs = round2(needs + fromDebtSurplus);
        }
    }

    const currentTotal = round2(needs + wants + savings + debt);
    const correction = round2(100 - currentTotal);
    needs = round2(needs + correction);

    return {
        ...normalized,
        needs,
        wants,
        savings,
        debt,
    };
}

export async function generateSmartDistribution(input: DistributionInput) {
    try {
        const { user } = await requireUserContext();
        assertRateLimit({
            key: `onboarding-ai-distribution:${user.id}`,
            limit: 6,
            windowMs: 60_000,
        });

        const google = requireGoogleAiProvider();
        const modelCandidates = [
            process.env.GEMINI_DISTRIBUTION_MODEL,
            "gemini-2.5-flash",
            "gemini-1.5-pro",
        ].filter(Boolean) as string[];

        let object: z.infer<typeof distributionSchema> | null = null;
        let lastModelError: unknown = null;

        for (const modelName of modelCandidates) {
            try {
                const result = await generateObject({
                    model: google(modelName),
                    schema: distributionSchema,
                    system: `Eres un asesor financiero actuando para la app CashFlow. Tu objetivo es recomendar una regla de distribución presupuestaria porcentual exacta (valores numéricos de 0 a 100 para Needs, Wants, Savings y Debt). 
Reglas Críticas:
1. La suma de los 4 porcentajes devueltos debe ser exactamente 100.
2. "needs" debe cubrir al menos el flujo operativo obligatorio: gastos fijos + gastos variables + pago total de tarjetas con estrategia "full" (esas tarjetas sí salen de caja mensual).
3. "debt" debe cubrir al menos los pagos mínimos de deuda revolvente (tarjetas no "full"), idealmente más para amortizar capital.
4. Si una tarjeta está marcada con paymentStrategy="full", NO la clasifiques como deuda revolvente, pero SÍ considera su salida de caja mensual.
5. Solo asigna ahorro cuando las obligaciones operativas y de deuda mínima estén cubiertas.

Debes devolver un JSON estructurado de acuerdo al schema: needs, wants, savings, debt y un campo textual 'reasoning' (motivando de forma precisa la decisión, en español, dirígete directamente al usuario en segunda persona).`,
                    prompt: `
Costos Locales: País: ${input.country}, Moneda: ${input.currency}

Contexto Financiero del Usuario:
Ingreso Neto Consolidado: ${input.consolidatedIncome}
Gastos Fijos Presupuestados: ${input.fixedExpensesBudget}
Gastos Variables Presupuestados: ${input.variableExpensesBudget}
Pago Mínimo Deuda Revolvente: ${input.estimatedDebtPayment}
Pago Total Tarjetas (estrategia full, flujo de caja): ${input.fullPaymentCardsCashOutflow}
Tarjetas de Crédito Registradas: ${JSON.stringify(input.creditCards)}
Metas de Ahorro Programadas: ${JSON.stringify(input.savingsGoals)}

Asigna los 4 porcentajes (que sumen 100) y justifica claramente tu elección basándote en su deuda, gastos y meta.
			`,
                });
                object = result.object;
                break;
            } catch (modelError) {
                lastModelError = modelError;
            }
        }

        if (!object) {
            throw lastModelError || new Error("No hay modelos de IA disponibles para distribución.");
        }

        const normalized = normalizeDistribution(object);
        const constrained = applyMinimumCoverageConstraints(normalized, input);
        const total =
            constrained.needs +
            constrained.wants +
            constrained.savings +
            constrained.debt;
        if (Math.abs(total - 100) > 0.01) {
            throw new Error("Los porcentajes normalizados no suman 100");
        }

        return { success: true, data: constrained };
    } catch (error) {
        logError("Error in generateSmartDistribution", error, {
            country: input.country,
            currency: input.currency,
            consolidatedIncome: input.consolidatedIncome,
            fixedExpensesBudget: input.fixedExpensesBudget,
            variableExpensesBudget: input.variableExpensesBudget,
            estimatedDebtPayment: input.estimatedDebtPayment,
            fullPaymentCardsCashOutflow: input.fullPaymentCardsCashOutflow,
            creditCardsCount: input.creditCards.length,
            savingsGoalsCount: input.savingsGoals.length,
        });
        if (error instanceof Error) {
            const normalizedMessage = error.message.toLowerCase();
            if (
                error.message.includes("GOOGLE_GENERATIVE_AI_API_KEY") ||
                error.message.includes("GEMINI_API_KEY") ||
                normalizedMessage.includes("api key") ||
                normalizedMessage.includes("permission denied")
            ) {
                return {
                    success: false,
                    error: "La API de Google AI no está configurada en el servidor. Define GOOGLE_GENERATIVE_AI_API_KEY y vuelve a intentar.",
                };
            }
            if (error.message === "No autorizado") {
                return {
                    success: false,
                    error: "Tu sesión expiró. Vuelve a iniciar sesión para usar el auto-completado con IA.",
                };
            }
            if (error.message.startsWith("Demasiadas solicitudes")) {
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: "No se pudo calcular la distribución con IA. Por favor intenta de nuevo." };
    }
}

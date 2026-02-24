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
2. "needs" debe ser suficiente porcentaje para cubrir los gastos fijos mensuales declarados.
3. "debt" debe ser suficiente porcentaje para cubrir al menos los pagos mínimos de las tarjetas de crédito (idealmente deberías destinar más para abono a capital si tienen deudas revolventes con alta TEA).
4. Fondeo de ahorros y deseos.
5. Si una tarjeta está marcada con paymentStrategy="full", trátala como medio de pago transaccional y no como deuda revolvente.

Debes devolver un JSON estructurado de acuerdo al schema: needs, wants, savings, debt y un campo textual 'reasoning' (motivando de forma precisa la decisión, en español, dirígete directamente al usuario en segunda persona).`,
                    prompt: `
Costos Locales: País: ${input.country}, Moneda: ${input.currency}

Contexto Financiero del Usuario:
Ingreso Neto Consolidado: ${input.consolidatedIncome}
Gastos Fijos Presupuestados: ${input.fixedExpensesBudget}
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
        const total =
            normalized.needs +
            normalized.wants +
            normalized.savings +
            normalized.debt;
        if (Math.abs(total - 100) > 0.01) {
            throw new Error("Los porcentajes normalizados no suman 100");
        }

        return { success: true, data: normalized };
    } catch (error) {
        logError("Error in generateSmartDistribution", error, {
            country: input.country,
            currency: input.currency,
            consolidatedIncome: input.consolidatedIncome,
            fixedExpensesBudget: input.fixedExpensesBudget,
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

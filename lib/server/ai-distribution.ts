"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { logError } from "./logger";

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
        tea?: number;
    }>;
    savingsGoals: Array<{
        name: string;
        targetAmount: number;
    }>;
};

export async function generateSmartDistribution(input: DistributionInput) {
    try {
        const { object } = await generateObject({
            model: google("gemini-1.5-pro"),
            schema: distributionSchema,
            system: `Eres un asesor financiero actuando para la app CashFlow. Tu objetivo es recomendar una regla de distribución presupuestaria porcentual exacta (valores numéricos de 0 a 100 para Needs, Wants, Savings y Debt). 
Reglas Críticas:
1. La suma de los 4 porcentajes devueltos debe ser exactamente 100.
2. "needs" debe ser suficiente porcentaje para cubrir los gastos fijos mensuales declarados.
3. "debt" debe ser suficiente porcentaje para cubrir al menos los pagos mínimos de las tarjetas de crédito (idealmente deberías destinar más para abono a capital si tienen deudas revolventes con alta TEA).
4. Fondeo de ahorros y deseos.

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

        // Verificamos estricta suma a 100 a posteriori
        const total = object.needs + object.wants + object.savings + object.debt;
        if (total !== 100) {
            throw new Error("Los porcentajes generados por la IA no suman 100");
        }

        return { success: true, data: object };
    } catch (error) {
        logError("Error in generateSmartDistribution", error, { input });
        return { success: false, error: "No se pudo calcular la distribución con IA. Por favor intenta de nuevo." };
    }
}

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUserContext } from "@/lib/server/context";
import { unstable_cache } from "next/cache";

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

// Cache responses for 3 weeks (21 days) to save AI credits
const REVALIDATE_SECONDS = 60 * 60 * 24 * 21;

const getCachedEstimate = unstable_cache(
    async (category: string, country: string, currency: string, context: string) => {
        const prompt = `Eres un asesor financiero experto en el costo de vida de ${country}.
El usuario quiere estimar su presupuesto mensual para la categoría "${category}".
Utiliza como moneda de resultado el código: ${currency}.

Detalles proporcionados por el usuario: ${context}

Tu tarea es calcular un estimado realista del gasto mensual en esa categoría basándote en los costos promedios actuales en ${country}.
Devuelve un objeto JSON con dos propiedades:
1. amount: El monto estimado como un número (ej: 1500).
2. reasoning: Una breve explicación de 1 o 2 oraciones de cómo calculaste este monto, para que el usuario sepa que es razonable.`;

        const { object } = await generateObject({
            model: google("gemini-1.5-pro-latest"),
            schema: z.object({
                amount: z.number().describe("Monto estimado mensual"),
                reasoning: z.string().describe("Breve explicación del cálculo"),
            }),
            prompt,
            temperature: 0.1, // Low temperature for factual consistency
        });

        return object;
    },
    ['budget-estimate-ai'], // Base cache key
    {
        revalidate: REVALIDATE_SECONDS,
    }
);

export async function POST(req: Request) {
    try {
        // Ensure user is authenticated, even if they don't have an org yet (during onboarding)
        await requireUserContext();

        const body = await req.json();
        const { category, country, currency, context } = body;

        if (!category || !country || !currency || !context) {
            return NextResponse.json(
                { error: "Faltan parámetros requeridos (category, country, currency, context)." },
                { status: 400 }
            );
        }

        // Normalize text to improve cache hit rates for simple variations (like extra spaces or casing)
        const normalizedContext = context.trim().toLowerCase();

        const result = await getCachedEstimate(category, country, currency, normalizedContext);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error estimating budget with AI:", error);
        return NextResponse.json(
            { error: "No se pudo generar la estimación. Por favor, ingresa el monto manualmente." },
            { status: 500 }
        );
    }
}

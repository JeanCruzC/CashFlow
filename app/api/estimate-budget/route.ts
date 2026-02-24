import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUserContext } from "@/lib/server/context";
import { unstable_cache } from "next/cache";
import { logError } from "@/lib/server/logger";
import { rejectCrossOrigin } from "@/lib/server/http-security";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { requireGoogleAiProvider } from "@/lib/server/google-ai";

// Cache responses for 3 weeks (21 days) to save AI credits
const REVALIDATE_SECONDS = 60 * 60 * 24 * 21;

const getCachedEstimate = unstable_cache(
    async (category: string, country: string, currency: string, context: string) => {
        const google = requireGoogleAiProvider();
        const prompt = `Eres un asesor financiero experto en el costo de vida de ${country}.
El usuario quiere estimar su presupuesto mensual para la categoría "${category}".
Utiliza como moneda de resultado el código: ${currency}.

Detalles proporcionados por el usuario: ${context}

Tu tarea es calcular un estimado realista del gasto mensual en esa categoría basándote en los costos promedios actuales en ${country}.
Devuelve un objeto JSON con dos propiedades:
1. amount: El monto estimado como un número (ej: 1500).
2. reasoning: Una breve explicación de 1 o 2 oraciones de cómo calculaste este monto, para que el usuario sepa que es razonable.`;

        const { object } = await generateObject({
            model: google("gemini-2.5-flash"),
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

const estimateBudgetPayloadSchema = z.object({
    category: z.string().trim().min(1).max(80),
    country: z.string().trim().min(2).max(60),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    context: z.string().trim().min(3).max(600),
});

export async function POST(req: Request) {
    try {
        const csrfResponse = rejectCrossOrigin(req, "Origen no permitido para estimar presupuesto");
        if (csrfResponse) return csrfResponse;

        // Ensure user is authenticated, even if they don't have an org yet (during onboarding)
        const { user } = await requireUserContext();
        assertRateLimit({
            key: `ai-budget-estimate:${user.id}`,
            limit: 20,
            windowMs: 60_000,
        });

        const body = await req.json();
        const parsed = estimateBudgetPayloadSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Parámetros inválidos para la estimación." }, { status: 400 });
        }
        const { category, country, currency, context } = parsed.data;

        // Normalize text to improve cache hit rates for simple variations (like extra spaces or casing)
        const normalizedContext = context.trim().toLowerCase();

        const result = await getCachedEstimate(category, country, currency, normalizedContext);

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof Error) {
            const normalizedMessage = error.message.toLowerCase();
            if (
                error.message.includes("GOOGLE_GENERATIVE_AI_API_KEY") ||
                error.message.includes("GEMINI_API_KEY") ||
                normalizedMessage.includes("api key") ||
                normalizedMessage.includes("permission denied")
            ) {
                return NextResponse.json(
                    { error: "La API de Google AI no está configurada en el servidor." },
                    { status: 503 }
                );
            }
            if (error.message === "No autorizado") {
                return NextResponse.json(
                    { error: "No autorizado" },
                    { status: 401 }
                );
            }
            if (error.message.startsWith("Demasiadas solicitudes")) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 429 }
                );
            }
        }
        logError("Error estimating budget with AI", error);
        return NextResponse.json(
            { error: "No se pudo generar la estimación. Por favor, ingresa el monto manualmente." },
            { status: 500 }
        );
    }
}

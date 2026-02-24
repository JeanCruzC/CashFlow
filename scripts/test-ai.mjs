import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

async function main() {
    const category = "Alimentación";
    const country = "Perú";
    const currency = "PEN";
    const context = "Somos 2 adultos vivimos en callao y usualmente compramos en mercado y otras veces en lima mayormente consumimos pollo y papas mas arroz que talalrin y si comemos tallarin comemos con atun y de beber tomamos agua y ocasionalmente gaseosa";

    const prompt = `Eres un asesor financiero experto en el costo de vida de ${country}.
El usuario quiere estimar su presupuesto mensual para la categoría "${category}".
Utiliza como moneda de resultado el código: ${currency}.

Detalles proporcionados por el usuario: ${context}

Tu tarea es calcular un estimado realista del gasto mensual en esa categoría basándote en los costos promedios actuales en ${country}.
Devuelve un objeto JSON con dos propiedades:
1. amount: El monto estimado como un número (ej: 1500).
2. reasoning: Una breve explicación de 1 o 2 oraciones de cómo calculaste este monto, para que el usuario sepa que es razonable.`;

    try {
        const { object } = await generateObject({
            model: google("gemini-2.5-flash"),
            schema: z.object({
                amount: z.number().describe("Monto estimado mensual"),
                reasoning: z.string().describe("Breve explicación del cálculo"),
            }),
            prompt,
            temperature: 0.1,
        });
        console.log("Success:", object);
    } catch (e) {
        console.error("Error generation failed:", e);
    }
}

main();

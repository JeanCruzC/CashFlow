import { createGoogleGenerativeAI } from "@ai-sdk/google";

const GOOGLE_AI_KEY =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

const googleAiProvider = GOOGLE_AI_KEY
    ? createGoogleGenerativeAI({ apiKey: GOOGLE_AI_KEY })
    : null;

export function getGoogleAiProvider() {
    return googleAiProvider;
}

export function requireGoogleAiProvider() {
    if (!googleAiProvider) {
        throw new Error(
            "Falta configurar GOOGLE_GENERATIVE_AI_API_KEY (o GEMINI_API_KEY / GOOGLE_API_KEY) en el servidor."
        );
    }
    return googleAiProvider;
}

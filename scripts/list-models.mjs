import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

async function listModels() {
    try {
        const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`);
        const data = await models.json();
        console.log("Available generation models:");
        data.models.forEach(model => {
            if (model.supportedGenerationMethods.includes("generateContent")) {
                console.log(model.name);
            }
        });
    } catch (error) {
        console.error("Error fetching models", error);
    }
}

listModels();

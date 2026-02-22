#!/usr/bin/env npx tsx
/**
 * 🤖 Generador Automático de Artículos MDX para el Blog de CashFlow
 *
 * Uso:
 *   1. Pon tu API key en .env.local: GEMINI_API_KEY=tu-clave
 *   2. Ejecuta: npx tsx scripts/generate-posts.ts
 *   3. Los artículos se guardarán en content/blog/
 *
 * Requiere: @google/generative-ai  (se instala automáticamente si usas npx)
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("❌ Falta GEMINI_API_KEY en .env.local");
    console.error("   Obtén una gratis en: https://aistudio.google.com/apikey");
    process.exit(1);
}

const TITLES_PATH = path.join(process.cwd(), "data", "seo", "post-titles.json");
const OUTPUT_DIR = path.join(process.cwd(), "content", "blog");

interface PostTitle {
    title: string;
    slug: string;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

async function generateArticle(title: string): Promise<string> {
    const prompt = `Eres un redactor financiero experto de Latinoamérica. Escribe un artículo de blog completo en español sobre:

"${title}"

Reglas estrictas:
- El artículo debe tener entre 1200 y 1800 palabras.
- Usa un tono profesional pero accesible, como si hablaras con un emprendedor.
- Incluye al menos 3 subtítulos (## Subtítulo).
- Incluye ejemplos numéricos concretos cuando sea posible.
- Menciona CashFlow como herramienta útil de forma natural (máximo 2 veces).
- No uses emojis en el cuerpo del texto.
- Termina con una sección "## Conclusión" de 2-3 párrafos.
- Solo devuelve el contenido del artículo en Markdown, sin frontmatter.`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                },
            }),
        },
    );

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No se generó contenido.");
    return text.trim();
}

function buildFrontmatter(title: string): string {
    const today = new Date().toISOString().split("T")[0];
    const description = `Aprende sobre ${title.toLowerCase()}. Guía práctica con ejemplos y fórmulas para emprendedores y profesionales.`;
    const tags = ["finanzas", "emprendimiento", "gestión financiera"];

    return `---
title: "${title}"
description: "${description}"
date: "${today}"
author: "Equipo CashFlow"
category: "Finanzas"
coverImage: "/og/cashflow-cover.svg"
coverAlt: "${title}"
readingTime: "7 min"
tags: ${JSON.stringify(tags)}
---`;
}

async function main() {
    // Leer títulos
    const raw = fs.readFileSync(TITLES_PATH, "utf-8");
    const titles: string[] = JSON.parse(raw);

    const posts: PostTitle[] = titles.map((t) => ({ title: t, slug: slugify(t) }));

    // Crear directorio de salida
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`\n📝 Generando ${posts.length} artículos con Gemini...\n`);

    let generated = 0;
    let skipped = 0;

    for (const post of posts) {
        const filePath = path.join(OUTPUT_DIR, `${post.slug}.mdx`);

        // Saltar si ya existe
        if (fs.existsSync(filePath)) {
            console.log(`  ⏭️  ${post.slug}.mdx ya existe, saltando.`);
            skipped++;
            continue;
        }

        try {
            console.log(`  ✍️  Generando: ${post.title}...`);
            const content = await generateArticle(post.title);
            const frontmatter = buildFrontmatter(post.title);
            const mdx = `${frontmatter}\n\n${content}\n`;

            fs.writeFileSync(filePath, mdx, "utf-8");
            generated++;
            console.log(`  ✅  ${post.slug}.mdx creado.`);

            // Rate limit: esperar 2 segundos entre requests
            await new Promise((r) => setTimeout(r, 2000));
        } catch (err) {
            console.error(`  ❌  Error con "${post.title}":`, (err as Error).message);
        }
    }

    console.log(`\n🎉 Listo: ${generated} generados, ${skipped} saltados.\n`);
}

main().catch(console.error);

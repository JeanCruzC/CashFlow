#!/usr/bin/env npx tsx
/**
 * 🤖 Generador Automático de Artículos MDX para el Blog de CashFlow
 *
 * Uso:
 *   1. Pon tu API key en .env.local: QWEN_API_KEY=tu-clave
 *   2. Ejecuta: npx tsx scripts/generate-posts.ts
 *   3. Los artículos se guardarán en content/blog/
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.QWEN_API_KEY ?? "sk-ed4ab897cde3436abb3b4f6370838c0a";
const BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const MODEL = "qwen-turbo";

const TITLES_PATH = path.join(process.cwd(), "data", "seo", "post-titles.json");
const OUTPUT_DIR = path.join(process.cwd(), "content", "blog");

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
- Incluye al menos 3 subtítulos con formato ## Subtítulo.
- Incluye ejemplos numéricos concretos cuando sea posible.
- Menciona CashFlow como herramienta útil de forma natural (máximo 2 veces).
- No uses emojis en el cuerpo del texto.
- Termina con una sección "## Conclusión" de 2-3 párrafos.
- Solo devuelve el contenido del artículo en Markdown puro, sin frontmatter ni metadatos.`;

    const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4096,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
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
    const raw = fs.readFileSync(TITLES_PATH, "utf-8");
    const titles: string[] = JSON.parse(raw);
    const posts = titles.map((t) => ({ title: t, slug: slugify(t) }));

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`\n📝 Generando ${posts.length} artículos con Qwen (${MODEL})...\n`);

    let generated = 0;
    let skipped = 0;

    for (const post of posts) {
        const filePath = path.join(OUTPUT_DIR, `${post.slug}.mdx`);

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

            // Rate limit: 2s entre requests
            await new Promise((r) => setTimeout(r, 2000));
        } catch (err) {
            console.error(`  ❌  Error con "${post.title}":`, (err as Error).message);
        }
    }

    console.log(`\n🎉 Listo: ${generated} generados, ${skipped} saltados.\n`);
}

main().catch(console.error);

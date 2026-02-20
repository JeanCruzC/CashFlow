#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const errors = [];
const warnings = [];

function fail(message) {
    errors.push(message);
}

function warn(message) {
    warnings.push(message);
}

if (!fs.existsSync(migrationsDir)) {
    fail(`No existe el directorio de migraciones: ${migrationsDir}`);
} else {
    const files = fs
        .readdirSync(migrationsDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
        fail("No se encontraron migraciones .sql en supabase/migrations.");
    } else {
        const filePattern = /^(\d{3})_([a-z0-9_.-]+)\.sql$/i;
        const seenNumbers = new Set();
        let expected = 1;
        const fullCorpus = [];

        for (const file of files) {
            const match = filePattern.exec(file);
            if (!match) {
                fail(
                    `Nombre invalido de migracion '${file}'. Usa formato 000_nombre.sql`
                );
                continue;
            }

            const sequence = Number(match[1]);

            if (seenNumbers.has(sequence)) {
                fail(`Prefijo de migracion duplicado: ${match[1]} (${file})`);
            }
            seenNumbers.add(sequence);

            if (sequence !== expected) {
                fail(
                    `Secuencia de migraciones invalida: se esperaba ${String(
                        expected
                    ).padStart(3, "0")} y se encontro ${match[1]} (${file})`
                );
                expected = sequence + 1;
            } else {
                expected += 1;
            }

            const fullPath = path.join(migrationsDir, file);
            const content = fs.readFileSync(fullPath, "utf8");

            if (content.trim().length === 0) {
                fail(`Migracion vacia: ${file}`);
            }

            if (!content.includes(";")) {
                fail(`Migracion sin sentencias SQL detectables (;): ${file}`);
            }

            if (!content.endsWith("\n")) {
                warn(`Migracion sin salto de linea final: ${file}`);
            }

            fullCorpus.push(content.toLowerCase());
        }

        if (files.length > 0 && !files[0].startsWith("001_")) {
            fail(`La secuencia debe iniciar en 001_. Primer archivo: ${files[0]}`);
        }

        const schemaCorpus = fullCorpus.join("\n");
        const requiredInvariants = [
            "create_org_with_onboarding",
            "transactions_account_org_fkey",
            "budgets_category_org_fkey",
        ];

        for (const invariant of requiredInvariants) {
            if (!schemaCorpus.includes(invariant)) {
                fail(
                    `No se encontro el invariante requerido en migraciones: ${invariant}`
                );
            }
        }
    }
}

if (warnings.length > 0) {
    console.log("Warnings de migraciones:");
    for (const warningMessage of warnings) {
        console.log(`- ${warningMessage}`);
    }
}

if (errors.length > 0) {
    console.error("Errores de validacion de migraciones:");
    for (const errorMessage of errors) {
        console.error(`- ${errorMessage}`);
    }
    process.exit(1);
}

console.log("Migraciones validadas correctamente.");

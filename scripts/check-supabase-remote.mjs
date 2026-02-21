#!/usr/bin/env node

import { loadLocalEnv } from "./_load-env.mjs";

loadLocalEnv();

function getEnv(name, fallback = "") {
    return (process.env[name] || fallback).trim();
}

function unique(items) {
    return [...new Set(items)];
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const publicKey =
    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const apiKey = serviceRoleKey || publicKey;

const errors = [];
const warnings = [];

function fail(message) {
    errors.push(message);
}

function warn(message) {
    warnings.push(message);
}

if (!supabaseUrl) {
    fail("Falta NEXT_PUBLIC_SUPABASE_URL.");
}

if (!apiKey) {
    fail(
        "Falta key de Supabase. Define SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
}

const requiredTables = unique([
    "orgs",
    "org_members",
    "onboarding_state",
    "accounts",
    "categories_gl",
    "transactions",
    "budgets",
]);

async function checkTable(table) {
    const url = new URL(`/rest/v1/${table}?select=*&limit=1`, supabaseUrl).toString();
    const response = await fetch(url, {
        method: "GET",
        headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
        },
    });

    if (response.status === 404) {
        fail(`Tabla no encontrada en remoto: ${table}`);
        return;
    }

    if (response.status === 401 || response.status === 403) {
        warn(
            `Sin permisos para validar tabla '${table}' con la key actual (${response.status}). Recomendado: SUPABASE_SERVICE_ROLE_KEY para verificación completa.`
        );
        return;
    }

    if (response.status >= 400) {
        const text = await response.text();
        fail(`Error validando tabla '${table}': ${response.status} ${text.slice(0, 160)}`);
    }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, apiKey);

async function checkRpcExists(name) {
    const { error } = await supabase.rpc(name, {});

    // PGRST202 is "Could not find the function in the schema"
    if (error && error.code === 'PGRST202') {
        fail(`Función RPC no encontrada en remoto: ${name}`);
        return;
    }

    // Any other error (e.g. invalid arguments, unauthorized) means the function exists
    // but we just didn't call it correctly, which is fine for an existence check.
    if (error && (error.code === 'PGRST301' || error.message.includes('permission denied') || error.message.includes('violates'))) {
        return;
    }
}

async function checkAuthSettings() {
    const url = new URL("/auth/v1/settings", supabaseUrl).toString();
    const response = await fetch(url, {
        headers: {
            apikey: publicKey || apiKey,
            Authorization: `Bearer ${publicKey || apiKey}`,
        },
    });

    if (!response.ok) {
        fail(`No se pudo leer auth settings: ${response.status}`);
        return;
    }

    const data = await response.json();
    if (data?.disable_signup === true) {
        warn("Auth tiene disable_signup=true (registro desactivado).");
    }
    if (data?.external?.email === false) {
        warn("Auth tiene email provider desactivado.");
    }
}

async function main() {
    if (errors.length > 0) {
        // Fallos de precondición.
        for (const item of errors) {
            console.error(`- ${item}`);
        }
        process.exit(1);
    }

    try {
        for (const table of requiredTables) {
            await checkTable(table);
        }

        await checkAuthSettings();
    } catch (error) {
        fail(
            `Error inesperado consultando Supabase remoto: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    if (warnings.length > 0) {
        console.log("Warnings:");
        for (const warning of warnings) {
            console.log(`- ${warning}`);
        }
    }

    if (errors.length > 0) {
        console.error("Errores:");
        for (const item of errors) {
            console.error(`- ${item}`);
        }
        const hasSchemaGap = errors.some((item) =>
            item.includes("Tabla no encontrada") || item.includes("RPC no encontrada")
        );
        if (hasSchemaGap) {
            console.error(
                "Sugerencia: aplica migraciones remotas con 'npm run supabase:migrate:remote'."
            );
        }
        process.exit(1);
    }

    console.log("Supabase remoto validado correctamente.");
}

main();

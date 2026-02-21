#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { loadLocalEnv } from "./_load-env.mjs";

loadLocalEnv();

const cwd = process.cwd();
const errors = [];
const warnings = [];
const info = [];

function hasValue(name) {
    const value = process.env[name];
    return Boolean(value && value.trim().length > 0);
}

function exists(relativePath) {
    return fs.existsSync(path.join(cwd, relativePath));
}

function checkNodeVersion() {
    const raw = process.versions.node;
    const major = Number(raw.split(".")[0] || 0);

    if (!Number.isFinite(major) || major < 20) {
        errors.push(`Node.js ${raw} detectado. Se requiere Node.js >= 20 para Vercel.`);
        return;
    }

    info.push(`Node.js ${raw} OK`);
}

function checkProjectFiles() {
    if (!exists("vercel.json")) {
        errors.push("Falta vercel.json en la raiz del proyecto.");
    } else {
        info.push("vercel.json detectado");
    }

    if (!exists("next.config.mjs")) {
        errors.push("Falta next.config.mjs.");
    }

    const gitignorePath = path.join(cwd, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
        const gitignore = fs.readFileSync(gitignorePath, "utf8");
        if (!gitignore.split(/\r?\n/).some((line) => line.trim() === ".vercel")) {
            warnings.push("Agrega '.vercel' a .gitignore para evitar artefactos locales.");
        } else {
            info.push(".vercel ignorado en git");
        }
    }
}

function checkAppEnv() {
    if (!hasValue("NEXT_PUBLIC_SUPABASE_URL")) {
        errors.push("Falta NEXT_PUBLIC_SUPABASE_URL.");
    }

    if (
        !hasValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") &&
        !hasValue("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    ) {
        errors.push(
            "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (recomendado) o NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }

    if (!hasValue("APP_SITE_URL")) {
        warnings.push(
            "APP_SITE_URL no esta definido. Define el dominio productivo para sincronizar redirects de Supabase Auth."
        );
    } else if (!process.env.APP_SITE_URL?.startsWith("https://")) {
        warnings.push("APP_SITE_URL deberia usar https en produccion.");
    }

    if (!hasValue("APP_REDIRECT_URLS")) {
        warnings.push("APP_REDIRECT_URLS no definido. Recomendado para OAuth/Auth callbacks.");
    }

    if (!hasValue("SENTRY_DSN") && !hasValue("NEXT_PUBLIC_SENTRY_DSN")) {
        warnings.push("Sentry no configurado. Recomendado para observabilidad en produccion.");
    }
}

function checkCiSecrets() {
    const missing = [
        "VERCEL_TOKEN",
        "VERCEL_ORG_ID",
        "VERCEL_PROJECT_ID",
    ].filter((name) => !hasValue(name));

    if (missing.length > 0) {
        warnings.push(
            `Secretos de CI no detectados en entorno local (${missing.join(", ")}). Configuralos en GitHub Actions.`
        );
    } else {
        info.push("Variables VERCEL_* detectadas para deploy automatizado");
    }
}

checkNodeVersion();
checkProjectFiles();
checkAppEnv();
checkCiSecrets();

console.log("== Vercel Preflight ==");
for (const line of info) console.log(`OK: ${line}`);
for (const line of warnings) console.log(`WARN: ${line}`);
for (const line of errors) console.log(`ERROR: ${line}`);

if (errors.length > 0) {
    process.exit(1);
}

console.log("Preflight completado. El proyecto esta listo para migrar a Vercel.");

#!/usr/bin/env node

import { loadLocalEnv } from "./_load-env.mjs";

loadLocalEnv();

function getEnv(name, fallback = "") {
    return (process.env[name] || fallback).trim();
}

function unique(items) {
    return [...new Set(items)];
}

function parseList(value) {
    if (!value) return [];
    return unique(
        value
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean)
    );
}

function extractProjectRefFromUrl(url) {
    if (!url) return "";
    try {
        const hostname = new URL(url).hostname;
        return hostname.split(".")[0] || "";
    } catch {
        return "";
    }
}

function normalizeRedirects(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
        return unique(value.map((item) => String(item).trim()).filter(Boolean));
    }
    if (typeof value === "string") {
        return parseList(value);
    }
    return [];
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const projectRef =
    getEnv("SUPABASE_PROJECT_REF") || extractProjectRefFromUrl(supabaseUrl);
const accessToken = getEnv("SUPABASE_ACCESS_TOKEN");

const siteUrl = getEnv("APP_SITE_URL", "http://127.0.0.1:3001");
const expectedRedirects = parseList(
    getEnv(
        "APP_REDIRECT_URLS",
        `${siteUrl}/**,http://127.0.0.1:3001/**,http://localhost:3001/**`
    )
);

if (!projectRef) {
    console.error("Falta SUPABASE_PROJECT_REF (o NEXT_PUBLIC_SUPABASE_URL válido).");
    process.exit(1);
}

if (!accessToken) {
    console.error("Falta SUPABASE_ACCESS_TOKEN para usar la Management API.");
    process.exit(1);
}

const baseUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

async function fetchCurrentConfig() {
    const response = await fetch(baseUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`GET auth config falló (${response.status}): ${body.slice(0, 240)}`);
    }

    return response.json();
}

async function patchConfig(payload) {
    const response = await fetch(baseUrl, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`PATCH auth config falló (${response.status}): ${body.slice(0, 240)}`);
    }
}

function sameSet(a, b) {
    if (a.length !== b.length) return false;
    const aa = [...a].sort();
    const bb = [...b].sort();
    return aa.every((value, index) => value === bb[index]);
}

async function main() {
    const current = await fetchCurrentConfig();
    const currentSiteUrl = (current?.site_url || "").trim();
    const currentRedirects = normalizeRedirects(
        current?.uri_allow_list || current?.redirect_urls || current?.additional_redirect_urls
    );

    const siteNeedsUpdate = currentSiteUrl !== siteUrl;
    const redirectNeedsUpdate = !sameSet(currentRedirects, expectedRedirects);

    if (!siteNeedsUpdate && !redirectNeedsUpdate) {
        console.log("Auth config ya está sincronizada.");
        return;
    }

    const payload = { site_url: siteUrl };
    if (redirectNeedsUpdate) {
        // En la API de Supabase/GoTrue este campo suele mapear a URI_ALLOW_LIST.
        payload.uri_allow_list = expectedRedirects;
    }

    try {
        await patchConfig(payload);
        console.log("Auth config sincronizada correctamente.");
        return;
    } catch (error) {
        // Fallback por si la API de tu proyecto no acepta uri_allow_list como array.
        if (redirectNeedsUpdate) {
            const retryPayload = {
                site_url: siteUrl,
                uri_allow_list: expectedRedirects.join(","),
            };
            await patchConfig(retryPayload);
            console.log("Auth config sincronizada correctamente (uri_allow_list como string).");
            return;
        }
        throw error;
    }
}

main().catch((error) => {
    console.error(
        error instanceof Error
            ? error.message
            : `Error inesperado sincronizando auth config: ${String(error)}`
    );
    process.exit(1);
});

#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL;
const routesInput = process.env.SMOKE_ROUTES || "/,/login,/register";
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);

if (!baseUrl) {
    console.error("SMOKE_BASE_URL no definido.");
    process.exit(1);
}

const routes = routesInput
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

if (routes.length === 0) {
    console.error("No se definieron rutas para smoke checks.");
    process.exit(1);
}

async function run() {
    for (const route of routes) {
        const url = new URL(route, baseUrl).toString();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { "Cache-Control": "no-cache" },
                signal: controller.signal,
            });

            if (!response.ok) {
                console.error(`Smoke check falló: ${url} -> ${response.status}`);
                process.exit(1);
            }

            console.log(`OK ${url} -> ${response.status}`);
        } catch (error) {
            console.error(`Smoke check error: ${url} -> ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        } finally {
            clearTimeout(timer);
        }
    }
}

run();

#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey || !testEmail || !testPassword) {
    console.error("Faltan variables TEST_SUPABASE_URL/ANON_KEY/TEST_USER_EMAIL/TEST_USER_PASSWORD.");
    process.exit(1);
}

const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});

function today() {
    return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
    return new Date().toISOString().slice(0, 7);
}

async function run() {
    const signIn = await client.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
    });

    if (signIn.error || !signIn.data.user) {
        throw signIn.error || new Error("No se pudo autenticar usuario de testing");
    }

    const userId = signIn.data.user.id;
    const seedName = `CashFlow Seed ${Date.now()}`;

    const { data: orgId, error: orgError } = await client.rpc("create_org_with_onboarding", {
        p_profile_type: "business",
        p_org_name: seedName,
        p_country: "US",
        p_currency: "USD",
    });

    if (orgError || !orgId) {
        throw orgError || new Error("No se pudo crear organización de testing");
    }

    const org = String(orgId);

    const accountInsert = await client
        .from("accounts")
        .insert([
            {
                org_id: org,
                name: "Banco Operativo",
                account_type: "bank",
                currency: "USD",
                opening_balance: 25000,
            },
            {
                org_id: org,
                name: "Caja Chica",
                account_type: "cash",
                currency: "USD",
                opening_balance: 500,
            },
        ])
        .select("id, name");

    if (accountInsert.error || !accountInsert.data || accountInsert.data.length < 2) {
        throw accountInsert.error || new Error("No se pudieron crear cuentas de testing");
    }

    const accountByName = new Map(accountInsert.data.map((account) => [account.name, account.id]));

    const { data: categories, error: categoryError } = await client
        .from("categories_gl")
        .select("id, kind, name")
        .eq("org_id", org)
        .in("kind", ["revenue", "opex", "cogs"]);

    if (categoryError || !categories || categories.length === 0) {
        throw categoryError || new Error("No se encontraron categorías semilla");
    }

    const revenueCategory = categories.find((category) => category.kind === "revenue");
    const opexCategory = categories.find((category) => category.kind === "opex");
    const cogsCategory = categories.find((category) => category.kind === "cogs");

    if (!revenueCategory || !opexCategory || !cogsCategory) {
        throw new Error("Faltan categorías base (revenue/opex/cogs)");
    }

    const txInsert = await client.from("transactions").insert([
        {
            org_id: org,
            date: today(),
            description: "Venta mensual",
            account_id: accountByName.get("Banco Operativo"),
            category_gl_id: revenueCategory.id,
            amount: 7800,
            currency: "USD",
            created_by: userId,
        },
        {
            org_id: org,
            date: today(),
            description: "Pago proveedores",
            account_id: accountByName.get("Banco Operativo"),
            category_gl_id: cogsCategory.id,
            amount: -2200,
            currency: "USD",
            created_by: userId,
        },
        {
            org_id: org,
            date: today(),
            description: "Servicios operativos",
            account_id: accountByName.get("Caja Chica"),
            category_gl_id: opexCategory.id,
            amount: -680,
            currency: "USD",
            created_by: userId,
        },
    ]);

    if (txInsert.error) {
        throw txInsert.error;
    }

    const budgetInsert = await client.from("budgets").insert([
        {
            org_id: org,
            month: currentMonth(),
            category_gl_id: opexCategory.id,
            amount: 1200,
        },
        {
            org_id: org,
            month: currentMonth(),
            category_gl_id: cogsCategory.id,
            amount: 2600,
        },
    ]);

    if (budgetInsert.error) {
        throw budgetInsert.error;
    }

    const forecastInsert = await client.from("forecast_assumptions").upsert(
        {
            org_id: org,
            month: currentMonth(),
            revenue_growth_rate: 7.5,
            revenue_amount: 8400,
            cogs_percent: 30,
            fixed_opex: 900,
            variable_opex_percent: 8,
            one_off_amount: 0,
            note: "Fixture de pruebas de integración",
        },
        { onConflict: "org_id,month" }
    );

    if (forecastInsert.error) {
        throw forecastInsert.error;
    }

    console.log(JSON.stringify({ status: "ok", org_id: org, seed_name: seedName }, null, 2));
    await client.auth.signOut();
}

run().catch(async (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    await client.auth.signOut();
    process.exit(1);
});

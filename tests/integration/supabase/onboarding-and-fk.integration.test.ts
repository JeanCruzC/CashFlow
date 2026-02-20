import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type TypedSupabase = SupabaseClient;

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

const hasDbConfig = Boolean(supabaseUrl && supabaseAnonKey && testEmail && testPassword);
const describeDb = hasDbConfig ? describe : describe.skip;

describeDb("integration/supabase onboarding + tenant FK", () => {
    let client: TypedSupabase;
    let userId: string;
    const createdOrgIds: string[] = [];

    async function createOrg(profile: "personal" | "business", suffix: string) {
        const { data, error } = await client.rpc("create_org_with_onboarding", {
            p_profile_type: profile,
            p_org_name: `CashFlow Test ${suffix}`,
            p_country: "US",
            p_currency: "USD",
        });

        expect(error).toBeNull();
        expect(data).toBeTruthy();

        const orgId = String(data);
        createdOrgIds.push(orgId);
        return orgId;
    }

    beforeAll(async () => {
        client = createClient(supabaseUrl!, supabaseAnonKey!, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        });

        const { data, error } = await client.auth.signInWithPassword({
            email: testEmail!,
            password: testPassword!,
        });

        expect(error).toBeNull();
        expect(data.user).toBeTruthy();

        userId = data.user!.id;
    });

    afterAll(async () => {
        if (createdOrgIds.length > 0) {
            await client.from("orgs").delete().in("id", createdOrgIds);
        }

        await client.auth.signOut();
    });

    it("crea org + membership + onboarding_state de forma atómica", async () => {
        const orgId = await createOrg("personal", `atomic-${Date.now()}`);

        const { data: member, error: memberError } = await client
            .from("org_members")
            .select("org_id, user_id, role")
            .eq("org_id", orgId)
            .eq("user_id", userId)
            .maybeSingle();

        expect(memberError).toBeNull();
        expect(member?.role).toBe("owner");

        const { data: onboarding, error: onboardingError } = await client
            .from("onboarding_state")
            .select("org_id, user_id, profile_type, step")
            .eq("org_id", orgId)
            .eq("user_id", userId)
            .maybeSingle();

        expect(onboardingError).toBeNull();
        expect(onboarding?.profile_type).toBe("personal");
        expect(onboarding?.step).toBe(1);
    });

    it("bloquea referencias cruzadas de account_id entre organizaciones", async () => {
        const orgA = await createOrg("business", `fk-a-${Date.now()}`);
        const orgB = await createOrg("business", `fk-b-${Date.now()}`);

        const { data: accountA, error: accountAError } = await client
            .from("accounts")
            .insert({
                org_id: orgA,
                name: "Cuenta Org A",
                account_type: "bank",
                currency: "USD",
                opening_balance: 1000,
            })
            .select("id")
            .single();

        expect(accountAError).toBeNull();
        expect(accountA?.id).toBeTruthy();

        const { data: accountB, error: accountBError } = await client
            .from("accounts")
            .insert({
                org_id: orgB,
                name: "Cuenta Org B",
                account_type: "bank",
                currency: "USD",
                opening_balance: 500,
            })
            .select("id")
            .single();

        expect(accountBError).toBeNull();
        expect(accountB?.id).toBeTruthy();

        const { data: categoryB, error: categoryBError } = await client
            .from("categories_gl")
            .select("id")
            .eq("org_id", orgB)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        expect(categoryBError).toBeNull();
        expect(categoryB?.id).toBeTruthy();

        const sharedDescription = `FK isolation ${Date.now()}`;

        const invalidInsert = await client.from("transactions").insert({
            org_id: orgB,
            date: "2026-02-20",
            description: `${sharedDescription} invalid`,
            account_id: accountA!.id,
            category_gl_id: categoryB!.id,
            amount: 15,
            currency: "USD",
            created_by: userId,
        });

        expect(invalidInsert.error).toBeTruthy();

        const validInsert = await client.from("transactions").insert({
            org_id: orgB,
            date: "2026-02-20",
            description: `${sharedDescription} valid`,
            account_id: accountB!.id,
            category_gl_id: categoryB!.id,
            amount: 30,
            currency: "USD",
            created_by: userId,
        });

        expect(validInsert.error).toBeNull();
    });
});

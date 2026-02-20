import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";

export type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface UserContext {
    supabase: AppSupabaseClient;
    user: User;
}

export interface OrgContext extends UserContext {
    orgId: string;
}

export async function getUserContextOrNull(): Promise<UserContext | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
        supabase,
        user,
    };
}

export async function requireUserContext(): Promise<UserContext> {
    const context = await getUserContextOrNull();
    if (!context) throw new Error("No autorizado");
    return context;
}

export async function getOrgContextOrNull(): Promise<OrgContext | null> {
    const userContext = await getUserContextOrNull();
    if (!userContext) return null;

    const { data: member, error } = await userContext.supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", userContext.user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!member?.org_id) return null;

    return {
        ...userContext,
        orgId: member.org_id,
    };
}

export async function requireOrgContext(): Promise<OrgContext> {
    const context = await getOrgContextOrNull();
    if (!context) {
        const userContext = await getUserContextOrNull();
        if (!userContext) throw new Error("No autorizado");
        throw new Error("No se encontró una organización activa");
    }
    return context;
}

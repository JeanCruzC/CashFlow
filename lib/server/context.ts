import { createClient } from "@/lib/supabase/server";
import { User } from "@supabase/supabase-js";
import { cache } from "react";

export type AppSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export interface UserContext {
    supabase: AppSupabaseClient;
    user: User;
}

export interface OrgContext {
    supabase: AppSupabaseClient;
    orgId: string;
}

export interface OrgActorContext extends OrgContext {
    user: User;
}

function isAuthSessionMissingError(error: unknown) {
    if (!error || typeof error !== "object") return false;
    const maybeStatus = "status" in error ? (error as { status?: unknown }).status : undefined;
    const maybeCode = "code" in error ? (error as { code?: unknown }).code : undefined;
    const maybeName = "name" in error ? (error as { name?: unknown }).name : undefined;
    return (
        maybeStatus === 401 ||
        maybeCode === "PGRST301" ||
        maybeName === "AuthSessionMissingError"
    );
}

async function resolveUserOrNull(supabase: AppSupabaseClient): Promise<User | null> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        if (isAuthSessionMissingError(sessionError)) return null;
        throw sessionError;
    }

    if (sessionData.session?.user) {
        return sessionData.session.user;
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        if (isAuthSessionMissingError(userError)) return null;
        throw userError;
    }

    if (!user) return null;
    return user;
}

const getUserContextOrNullUncached = async (): Promise<UserContext | null> => {
    const supabase = await createClient();
    const user = await resolveUserOrNull(supabase);
    if (!user) return null;

    return {
        supabase,
        user,
    };
};

export const getUserContextOrNull = cache(getUserContextOrNullUncached);

export async function requireUserContext(): Promise<UserContext> {
    const context = await getUserContextOrNull();
    if (!context) throw new Error("No autorizado");
    return context;
}

const getOrgContextOrNullUncached = async (): Promise<OrgContext | null> => {
    const supabase = await createClient();

    const { data: member, error } = await supabase
        .from("org_members")
        .select("org_id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        if (isAuthSessionMissingError(error)) return null;
        throw error;
    }
    if (!member?.org_id) return null;

    return {
        supabase,
        orgId: member.org_id,
    };
};

export const getOrgContextOrNull = cache(getOrgContextOrNullUncached);

export async function requireOrgContext(): Promise<OrgContext> {
    const context = await getOrgContextOrNull();
    if (!context) {
        const userContext = await getUserContextOrNull();
        if (!userContext) throw new Error("No autorizado");
        throw new Error("No se encontró una organización activa");
    }
    return context;
}

export async function requireOrgActorContext(): Promise<OrgActorContext> {
    const context = await requireOrgContext();
    const user = await resolveUserOrNull(context.supabase);
    if (!user) throw new Error("No autorizado");

    return {
        ...context,
        user,
    };
}

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUserContext } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";
import { sanitizeUuid } from "@/lib/server/input-sanitizers";

const ACTIVE_ORG_COOKIE = "cf_active_org_id";

export interface WorkspaceSummary {
    orgId: string;
    name: string;
    type: "personal" | "business";
    currency: string;
    role: string;
    createdAt: string;
}

export async function getUserWorkspaces(): Promise<WorkspaceSummary[]> {
    const { supabase, user } = await requireUserContext();

    const { data, error } = await supabase
        .from("org_members")
        .select("org_id, role, created_at, orgs(id, name, type, currency)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        logError("Error fetching user workspaces", error, { userId: user.id });
        return [];
    }

    const mapped = (data || [])
        .map((row) => {
            const org = Array.isArray(row.orgs) ? row.orgs[0] : row.orgs;
            if (!org || !org.id) return null;

            return {
                orgId: String(org.id),
                name: String(org.name ?? "Workspace"),
                type: org.type === "business" ? "business" : "personal",
                currency: String(org.currency ?? "USD").toUpperCase(),
                role: String(row.role ?? "member"),
                createdAt: String(row.created_at ?? new Date().toISOString()),
            } satisfies WorkspaceSummary;
        })
        .filter((item): item is WorkspaceSummary => item !== null);

    const deduped = new Map<string, WorkspaceSummary>();
    for (const workspace of mapped) {
        if (!deduped.has(workspace.orgId)) {
            deduped.set(workspace.orgId, workspace);
        }
    }

    return Array.from(deduped.values());
}

export async function setActiveWorkspace(orgId: string) {
    const { supabase, user } = await requireUserContext();
    const safeOrgId = sanitizeUuid(orgId);

    if (!safeOrgId) {
        return { error: "Workspace inválido" };
    }

    const { data, error } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("org_id", safeOrgId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        logError("Error validating workspace access", error, { userId: user.id, orgId: safeOrgId });
        return { error: "No se pudo validar acceso al workspace" };
    }
    if (!data?.org_id) {
        return { error: "No tienes acceso a este workspace" };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, safeOrgId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/categories");
    revalidatePath("/dashboard/budget");
    revalidatePath("/dashboard/forecast");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/assistant");
    revalidatePath("/dashboard/settings");

    return { success: true };
}

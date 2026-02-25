"use server";

import { getOrgContextOrNull } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";
import type { IncomeGapRecommendationResult } from "@/lib/server/ai-income-gap";

export interface AssistantInsight {
    id: string;
    source: string;
    title: string;
    created_at: string;
    recommendation: IncomeGapRecommendationResult;
}

function isMissingTableError(error: unknown) {
    if (!error || typeof error !== "object") return false;
    const value = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof value.code === "string" ? value.code : "";
    const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
    const details = typeof value.details === "string" ? value.details.toLowerCase() : "";
    return code === "42P01" || message.includes("does not exist") || details.includes("does not exist");
}

function toRecommendation(raw: unknown): IncomeGapRecommendationResult | null {
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    if (typeof value.summary !== "string") return null;
    if (typeof value.currency !== "string") return null;

    return {
        generated_at: String(value.generated_at ?? new Date().toISOString()),
        source_model: value.source_model === "gemini" ? "gemini" : "deterministic",
        country: String(value.country ?? "PE"),
        currency: String(value.currency),
        consolidated_income: Number(value.consolidated_income ?? 0),
        recommended_income: Number(value.recommended_income ?? 0),
        additional_income_needed: Number(value.additional_income_needed ?? 0),
        operational_commitment: Number(value.operational_commitment ?? 0),
        required_debt_payment: Number(value.required_debt_payment ?? 0),
        required_savings_for_goals: Number(value.required_savings_for_goals ?? 0),
        healthy_plan_pct: {
            needs_pct: Number((value.healthy_plan_pct as Record<string, unknown> | undefined)?.needs_pct ?? 0),
            wants_pct: Number((value.healthy_plan_pct as Record<string, unknown> | undefined)?.wants_pct ?? 0),
            savings_pct: Number((value.healthy_plan_pct as Record<string, unknown> | undefined)?.savings_pct ?? 0),
            debt_pct: Number((value.healthy_plan_pct as Record<string, unknown> | undefined)?.debt_pct ?? 0),
        },
        healthy_plan_amounts: {
            needs_amount: Number((value.healthy_plan_amounts as Record<string, unknown> | undefined)?.needs_amount ?? 0),
            wants_amount: Number((value.healthy_plan_amounts as Record<string, unknown> | undefined)?.wants_amount ?? 0),
            savings_amount: Number((value.healthy_plan_amounts as Record<string, unknown> | undefined)?.savings_amount ?? 0),
            debt_amount: Number((value.healthy_plan_amounts as Record<string, unknown> | undefined)?.debt_amount ?? 0),
        },
        goals: Array.isArray(value.goals)
            ? value.goals
                .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
                .map((goal) => ({
                    id: String(goal.id ?? "goal"),
                    name: String(goal.name ?? "Meta"),
                    target_amount: Number(goal.target_amount ?? 0),
                    current_amount: Number(goal.current_amount ?? 0),
                    target_months: Number(goal.target_months ?? 0),
                    suggested_months: Number(goal.suggested_months ?? 0),
                    projected_monthly_contribution: Number(goal.projected_monthly_contribution ?? 0),
                    required_monthly_contribution: Number(goal.required_monthly_contribution ?? 0),
                    gap_monthly_contribution: Number(goal.gap_monthly_contribution ?? 0),
                }))
            : [],
        user_scenario: value.user_scenario && typeof value.user_scenario === "object"
            ? {
                achievable_additional_income: Number(
                    (value.user_scenario as Record<string, unknown>).achievable_additional_income ?? 0
                ),
                scenario_income: Number(
                    (value.user_scenario as Record<string, unknown>).scenario_income ?? 0
                ),
                scenario_savings_pool: Number(
                    (value.user_scenario as Record<string, unknown>).scenario_savings_pool ?? 0
                ),
                scenario_income_gap_to_target: Number(
                    (value.user_scenario as Record<string, unknown>).scenario_income_gap_to_target ?? 0
                ),
                goals: Array.isArray((value.user_scenario as Record<string, unknown>).goals)
                    ? ((value.user_scenario as Record<string, unknown>).goals as unknown[])
                        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
                        .map((goal) => ({
                            id: String(goal.id ?? "goal"),
                            name: String(goal.name ?? "Meta"),
                            scenario_monthly_contribution: Number(goal.scenario_monthly_contribution ?? 0),
                            scenario_eta_months:
                                goal.scenario_eta_months === null
                                    ? null
                                    : Number(goal.scenario_eta_months ?? 0),
                            meets_target: Boolean(goal.meets_target),
                        }))
                    : [],
            }
            : undefined,
        summary: String(value.summary),
        action_items: Array.isArray(value.action_items)
            ? value.action_items.map((item) => String(item))
            : [],
    };
}

async function getFallbackFromOnboardingState() {
    const context = await getOrgContextOrNull();
    if (!context) return [];

    const { supabase, orgId } = context;
    const { data, error } = await supabase
        .from("onboarding_state")
        .select("id, answers, completed_at, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        if (error) {
            logError("Error loading onboarding fallback for assistant insights", error, { orgId });
        }
        return [];
    }

    const answers = data.answers as Record<string, unknown> | null;
    const recommendation = toRecommendation(answers?.assistantRecommendation);
    if (!recommendation) return [];

    return [
        {
            id: `onboarding-${data.id}`,
            source: "onboarding_income_plan",
            title: "Plan de ingresos recomendado (Onboarding)",
            created_at: String(data.completed_at ?? data.created_at ?? new Date().toISOString()),
            recommendation,
        } satisfies AssistantInsight,
    ];
}

export async function getAssistantInsights(limit = 10): Promise<AssistantInsight[]> {
    const context = await getOrgContextOrNull();
    if (!context) return [];

    const { supabase, orgId } = context;
    const { data, error } = await supabase
        .from("assistant_insights")
        .select("id, source, title, recommendation, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) {
        if (!isMissingTableError(error)) {
            logError("Error loading assistant insights", error, { orgId });
        }
        return getFallbackFromOnboardingState();
    }

    const insights: AssistantInsight[] = (data ?? [])
        .map((item) => {
            const recommendation = toRecommendation(item.recommendation);
            if (!recommendation) return null;
            return {
                id: String(item.id),
                source: String(item.source ?? "onboarding_income_plan"),
                title: String(item.title ?? "Recomendación financiera"),
                created_at: String(item.created_at ?? new Date().toISOString()),
                recommendation,
            } satisfies AssistantInsight;
        })
        .filter((item): item is AssistantInsight => item !== null);

    if (insights.length > 0) return insights;
    return getFallbackFromOnboardingState();
}

import { getAssistantInsights } from "@/app/actions/assistant";
import { ModuleHero } from "@/components/ui/ModuleHero";
import { ScenarioPlanner } from "@/components/assistant/ScenarioPlanner";

function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("es-PE", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(value));
}

export default async function AssistantPage() {
    const insights = await getAssistantInsights(12);
    const latest = insights[0] || null;

    return (
        <div className="min-h-screen">
            <ModuleHero
                eyebrow="CONFIGURACIÓN · RECOMENDACIONES"
                title="Sugerencias guardadas"
                description={`Recomendaciones de ingreso, ahorro y metas guardadas${latest ? ` el ${formatDate(latest.created_at)}` : ""}`}
                rightPanel={
                    <>
                        <div className="h-stat"><div className="h-stat-lbl">Recomendaciones</div><div className="h-stat-n" style={{ color: "#5effd5" }}>{insights.length}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl">Última actualización</div><div style={{ fontSize: "12px", color: "rgba(255,255,255,.7)" }}>{latest ? formatDate(latest.created_at) : "—"}</div></div>
                    </>
                }
            />

            {insights.length === 0 ? (
                <div className="card fu in">
                    <div className="table-empty">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                        Todavía no hay recomendaciones guardadas. Completa el onboarding para generar la primera.
                    </div>
                </div>
            ) : (
                insights.map((insight) => {
                    const recommendation = insight.recommendation;
                    const currency = recommendation.currency || "PEN";

                    return (
                        <div key={insight.id} style={{ marginBottom: "20px" }}>
                            {/* Stat Cards */}
                            <div className="g4 fu in" style={{ transitionDelay: ".06s" }}>
                                <div className="stat-card"><div className="stat-badge sb-info">Ingreso actual</div><div className="stat-n">{formatMoney(recommendation.consolidated_income, currency)}</div></div>
                                <div className="stat-card"><div className="stat-badge sb-ok">Ingreso recomendado</div><div className="stat-n ok">{formatMoney(recommendation.recommended_income, currency)}</div></div>
                                <div className="stat-card"><div className="stat-badge sb-wa">Ingreso adicional sugerido</div><div className="stat-n wa">{formatMoney(recommendation.additional_income_needed, currency)}</div></div>
                                <div className="stat-card"><div className="stat-badge sb-ng">Ahorro requerido</div><div className="stat-n a">{formatMoney(recommendation.required_savings_for_goals, currency)}</div></div>
                            </div>

                            {/* Distribution + Actions */}
                            <div className="g2 fu in" style={{ transitionDelay: ".1s" }}>
                                <div className="card">
                                    <div className="card-head"><div><div className="card-title">Distribución saludable</div><div className="card-sub">Basada en tu perfil y metas actuales</div></div></div>
                                    <div className="dist-grid">
                                        <div className="dist-item"><div className="dist-lbl">Necesidades</div><div className="dist-val">{formatMoney(recommendation.healthy_plan_amounts.needs_amount, currency)}</div><div className="dist-pct">{recommendation.healthy_plan_pct.needs_pct.toFixed(1)}%</div></div>
                                        <div className="dist-item"><div className="dist-lbl">Deseos</div><div className="dist-val">{formatMoney(recommendation.healthy_plan_amounts.wants_amount, currency)}</div><div className="dist-pct">{recommendation.healthy_plan_pct.wants_pct.toFixed(1)}%</div></div>
                                        <div className="dist-item" style={{ borderColor: "rgba(0,184,122,.2)", background: "var(--ok-l)" }}><div className="dist-lbl" style={{ color: "var(--ok)" }}>Ahorro</div><div className="dist-val" style={{ color: "var(--ok)" }}>{formatMoney(recommendation.healthy_plan_amounts.savings_amount, currency)}</div><div className="dist-pct">{recommendation.healthy_plan_pct.savings_pct.toFixed(1)}%</div></div>
                                        <div className="dist-item"><div className="dist-lbl">Deuda</div><div className="dist-val">{formatMoney(recommendation.healthy_plan_amounts.debt_amount, currency)}</div><div className="dist-pct">{recommendation.healthy_plan_pct.debt_pct.toFixed(1)}%</div></div>
                                    </div>


                                </div>

                                <div className="card">
                                    <div className="card-head"><div><div className="card-title">Acciones sugeridas</div></div></div>
                                    <div className="rec-actions-grid" style={{ marginTop: 0 }}>
                                        {recommendation.action_items.map((item, index) => (
                                            <div key={`${insight.id}-action-${index}`} className="rec-action">{item}</div>
                                        ))}
                                    </div>

                                    <ScenarioPlanner recommendation={recommendation} />
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

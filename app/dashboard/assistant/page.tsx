import { getAssistantInsights } from "@/app/actions/assistant";
import { ModuleHero } from "@/components/ui/ModuleHero";

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

function formatHorizonLabel(months: number) {
    const safeMonths = Math.max(1, Math.round(months));
    if (safeMonths < 12) return `${safeMonths} meses`;
    const years = Math.floor(safeMonths / 12);
    const remainingMonths = safeMonths % 12;
    const yearLabel = years === 1 ? "año" : "años";
    if (remainingMonths === 0) return `${years} ${yearLabel}`;
    return `${years} ${yearLabel} ${remainingMonths} meses`;
}

export default async function AssistantPage() {
    const insights = await getAssistantInsights(12);
    const latest = insights[0] || null;

    return (
        <div className="space-y-6 animate-fade-in">
            <ModuleHero
                eyebrow="Configuracion · Recomendaciones"
                title="Sugerencias guardadas"
                description="Aqui quedan tus recomendaciones de ingreso, ahorro y metas para revisarlas cuando ajustes tu plan."
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Estado del modulo
                        </p>
                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">Recomendaciones</span>
                                <span className="font-semibold text-[#0f2233]">{insights.length}</span>
                            </div>
                            <div className="mt-2 text-xs text-surface-600">
                                {latest
                                    ? `Ultima actualizacion: ${formatDate(latest.created_at)}`
                                    : "Sin recomendaciones guardadas todavia."}
                            </div>
                        </div>
                    </>
                }
            />

            {insights.length === 0 ? (
                <section className="rounded-2xl border border-[#d9e2f0] bg-white px-6 py-10 text-sm text-surface-500 shadow-card">
                    Todavía no hay recomendaciones guardadas. Completa el paso final de onboarding para generar la primera.
                </section>
            ) : (
                insights.map((insight) => {
                    const recommendation = insight.recommendation;
                    const currency = recommendation.currency || "PEN";

                    return (
                        <section
                            key={insight.id}
                            className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-400">
                                        {insight.title}
                                    </p>
                                    <p className="mt-2 text-base font-semibold text-[#0f2233]">
                                        {recommendation.summary}
                                    </p>
                                </div>
                                <span className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-xs text-surface-600">
                                    {formatDate(insight.created_at)}
                                </span>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <article className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-3">
                                    <p className="text-xs text-surface-500">Ingreso actual</p>
                                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                                        {formatMoney(recommendation.consolidated_income, currency)}
                                    </p>
                                </article>
                                <article className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-3">
                                    <p className="text-xs text-surface-500">Ingreso recomendado</p>
                                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                                        {formatMoney(recommendation.recommended_income, currency)}
                                    </p>
                                </article>
                                <article className="rounded-xl border border-[#bfe1d8] bg-[#eef9f5] px-4 py-3">
                                    <p className="text-xs text-[#117068]">Ingreso adicional sugerido</p>
                                    <p className="mt-1 text-lg font-semibold text-[#117068]">
                                        {formatMoney(recommendation.additional_income_needed, currency)}
                                    </p>
                                </article>
                                <article className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-3">
                                    <p className="text-xs text-surface-500">Ahorro requerido</p>
                                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                                        {formatMoney(recommendation.required_savings_for_goals, currency)}
                                    </p>
                                </article>
                            </div>

                            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
                                <article className="rounded-xl border border-[#d9e2f0] bg-white p-4">
                                    <h3 className="text-sm font-semibold text-[#0f2233]">Distribución saludable</h3>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-xs">
                                            <p className="text-surface-500">Necesidades</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.needs_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.needs_amount, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-xs">
                                            <p className="text-surface-500">Deseos</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.wants_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.wants_amount, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-xs">
                                            <p className="text-surface-500">Ahorro</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.savings_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.savings_amount, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-xs">
                                            <p className="text-surface-500">Deuda</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.debt_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.debt_amount, currency)}
                                            </p>
                                        </div>
                                    </div>
                                </article>

                                <article className="rounded-xl border border-[#d9e2f0] bg-white p-4">
                                    <h3 className="text-sm font-semibold text-[#0f2233]">Acciones sugeridas</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-surface-600">
                                        {recommendation.action_items.map((item, index) => (
                                            <li key={`${insight.id}-action-${index}`} className="rounded-lg border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            </div>

                            {recommendation.user_scenario ? (
                                <article className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] p-4">
                                    <h3 className="text-sm font-semibold text-[#0f2233]">Escenario definido por usuario</h3>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                                        <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                            <p className="text-surface-500">Ingreso adicional</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {formatMoney(recommendation.user_scenario.achievable_additional_income, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                            <p className="text-surface-500">Ingreso total escenario</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {formatMoney(recommendation.user_scenario.scenario_income, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                            <p className="text-surface-500">Ahorro mensual escenario</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {formatMoney(recommendation.user_scenario.scenario_savings_pool, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                                            <p className="text-surface-500">Brecha restante</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {formatMoney(recommendation.user_scenario.scenario_income_gap_to_target, currency)}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            ) : null}

                            {recommendation.goals.length > 0 ? (
                                <article className="mt-4 rounded-xl border border-[#d9e2f0] bg-white p-4">
                                    <h3 className="text-sm font-semibold text-[#0f2233]">Metas evaluadas</h3>
                                    <div className="mt-3 overflow-x-auto rounded-lg border border-[#d9e2f0]">
                                        <table className="w-full min-w-[720px] text-sm">
                                            <thead className="bg-[#f5f9ff] text-left text-surface-500">
                                                <tr>
                                                    <th className="px-3 py-2 font-semibold">Meta</th>
                                                    <th className="px-3 py-2 font-semibold">Horizonte</th>
                                                    <th className="px-3 py-2 font-semibold">Aporte actual</th>
                                                    <th className="px-3 py-2 font-semibold">Aporte requerido</th>
                                                    <th className="px-3 py-2 font-semibold">Brecha</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#e8eef7] bg-white">
                                                {recommendation.goals.map((goal) => (
                                                    <tr key={`${insight.id}-goal-${goal.id}`}>
                                                        <td className="px-3 py-2 font-medium text-[#0f2233]">{goal.name}</td>
                                                        <td className="px-3 py-2 text-surface-600">{formatHorizonLabel(goal.target_months)}</td>
                                                        <td className="px-3 py-2 text-surface-600">
                                                            {formatMoney(goal.projected_monthly_contribution, currency)}
                                                        </td>
                                                        <td className="px-3 py-2 text-surface-600">
                                                            {formatMoney(goal.required_monthly_contribution, currency)}
                                                        </td>
                                                        <td className="px-3 py-2 font-semibold text-[#117068]">
                                                            {formatMoney(goal.gap_monthly_contribution, currency)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </article>
                            ) : null}
                        </section>
                    );
                })
            )}
        </div>
    );
}

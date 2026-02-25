import { getAssistantInsights } from "@/app/actions/assistant";

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

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-6 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">
                    Asistente financiero
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0f2233]">
                    Recomendaciones guardadas
                </h2>
                <p className="mt-2 max-w-3xl text-sm text-surface-500">
                    Este módulo conserva recomendaciones de planificación para que puedas revisar cuánto ingreso adicional necesitas y cómo ajustar plazos de tus metas sin alterar el comportamiento operativo de la app.
                </p>
            </section>

            {insights.length === 0 ? (
                <section className="rounded-3xl border border-surface-200 bg-white px-6 py-10 text-sm text-surface-500 shadow-card">
                    Todavía no hay recomendaciones guardadas. Completa el paso final de onboarding para generar la primera.
                </section>
            ) : (
                insights.map((insight) => {
                    const recommendation = insight.recommendation;
                    const currency = recommendation.currency || "PEN";

                    return (
                        <section
                            key={insight.id}
                            className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-400">
                                        {insight.title}
                                    </p>
                                    <p className="mt-2 text-base font-semibold text-[#0f2233]">
                                        {recommendation.summary}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-xs text-surface-600">
                                    {formatDate(insight.created_at)}
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <article className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                                    <p className="text-xs text-surface-500">Ingreso actual</p>
                                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                                        {formatMoney(recommendation.consolidated_income, currency)}
                                    </p>
                                </article>
                                <article className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
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
                                <article className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
                                    <p className="text-xs text-surface-500">Ahorro mensual requerido</p>
                                    <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                                        {formatMoney(recommendation.required_savings_for_goals, currency)}
                                    </p>
                                </article>
                            </div>

                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                <article className="rounded-2xl border border-surface-200 bg-white p-4">
                                    <h3 className="text-sm font-semibold text-[#0f2233]">
                                        Plan saludable recomendado
                                    </h3>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs">
                                            <p className="text-surface-500">Necesidades</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.needs_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.needs_amount, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs">
                                            <p className="text-surface-500">Deseos</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.wants_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.wants_amount, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs">
                                            <p className="text-surface-500">Ahorro</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.savings_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.savings_amount, currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-xs">
                                            <p className="text-surface-500">Deuda</p>
                                            <p className="mt-1 font-semibold text-[#0f2233]">
                                                {recommendation.healthy_plan_pct.debt_pct.toFixed(2)}% · {formatMoney(recommendation.healthy_plan_amounts.debt_amount, currency)}
                                            </p>
                                        </div>
                                    </div>
                                </article>

                                <article className="rounded-2xl border border-surface-200 bg-white p-4">
                                    <h3 className="text-sm font-semibold text-[#0f2233]">
                                        Acciones sugeridas
                                    </h3>
                                    <ul className="mt-3 space-y-2 text-sm text-surface-600">
                                        {recommendation.action_items.map((item, index) => (
                                            <li key={`${insight.id}-action-${index}`} className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            </div>

                            {recommendation.goals.length > 0 && (
                                <article className="mt-5 rounded-2xl border border-surface-200 bg-white p-4">
                                    <h3 className="text-sm font-semibold text-[#0f2233]">
                                        Metas evaluadas en la recomendación
                                    </h3>
                                    <div className="mt-3 overflow-x-auto rounded-xl border border-surface-200">
                                        <table className="w-full min-w-[720px] text-sm">
                                            <thead className="bg-surface-50 text-left text-surface-500">
                                                <tr>
                                                    <th className="px-3 py-2 font-semibold">Meta</th>
                                                    <th className="px-3 py-2 font-semibold">Horizonte</th>
                                                    <th className="px-3 py-2 font-semibold">Aporte actual</th>
                                                    <th className="px-3 py-2 font-semibold">Aporte requerido</th>
                                                    <th className="px-3 py-2 font-semibold">Brecha</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-surface-200 bg-white">
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
                            )}
                        </section>
                    );
                })
            )}
        </div>
    );
}

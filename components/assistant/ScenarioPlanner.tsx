"use client";

import { useMemo, useState } from "react";
import type { IncomeGapRecommendationResult } from "@/lib/server/ai-income-gap";

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function parseNonNegativeAmount(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(parsed, 0);
}

function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
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

interface ScenarioPlannerProps {
    recommendation: IncomeGapRecommendationResult;
}

export function ScenarioPlanner({ recommendation }: ScenarioPlannerProps) {
    const currency = recommendation.currency || "PEN";
    const initialAdditionalIncome = round2(
        Math.max(
            recommendation.user_scenario?.achievable_additional_income ??
                recommendation.additional_income_needed,
            0
        )
    );

    const [additionalIncomeInput, setAdditionalIncomeInput] = useState(
        String(initialAdditionalIncome)
    );

    const additionalIncome = useMemo(
        () => round2(parseNonNegativeAmount(additionalIncomeInput)),
        [additionalIncomeInput]
    );

    const scenarioIncome = useMemo(
        () => round2(recommendation.consolidated_income + additionalIncome),
        [recommendation.consolidated_income, additionalIncome]
    );

    const scenarioWantsReserve = useMemo(
        () =>
            round2(
                (scenarioIncome * recommendation.healthy_plan_pct.wants_pct) / 100
            ),
        [scenarioIncome, recommendation.healthy_plan_pct.wants_pct]
    );

    const baseCommitment = useMemo(
        () =>
            round2(
                recommendation.operational_commitment +
                    recommendation.required_debt_payment
            ),
        [recommendation.operational_commitment, recommendation.required_debt_payment]
    );

    const scenarioSavingsPool = useMemo(
        () =>
            round2(
                Math.max(scenarioIncome - baseCommitment - scenarioWantsReserve, 0)
            ),
        [scenarioIncome, baseCommitment, scenarioWantsReserve]
    );

    const incomeGapToTarget = useMemo(
        () =>
            round2(
                Math.max(recommendation.recommended_income - scenarioIncome, 0)
            ),
        [recommendation.recommended_income, scenarioIncome]
    );

    const scenarioGoalRows = useMemo(() => {
        const goals = recommendation.goals || [];
        if (goals.length === 0) return [];

        const scenarioSeedById = new Map(
            (recommendation.user_scenario?.goals || []).map((goal) => [
                goal.id,
                Math.max(goal.scenario_monthly_contribution, 0),
            ])
        );

        const weightSeeds = goals.map((goal) => {
            const fromScenario = scenarioSeedById.get(goal.id);
            if (typeof fromScenario === "number" && fromScenario > 0) return fromScenario;
            return Math.max(goal.projected_monthly_contribution, 0);
        });

        const totalWeight = weightSeeds.reduce((sum, weight) => sum + weight, 0);

        return goals.map((goal, index) => {
            const share =
                totalWeight > 0 ? weightSeeds[index] / totalWeight : 1 / goals.length;
            const scenarioContribution = round2(scenarioSavingsPool * share);
            const monthlyShortfall = round2(
                Math.max(goal.required_monthly_contribution - scenarioContribution, 0)
            );

            return {
                ...goal,
                scenarioContribution,
                monthlyShortfall,
            };
        });
    }, [recommendation.goals, recommendation.user_scenario?.goals, scenarioSavingsPool]);

    return (
        <>
            <article className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] p-4">
                <h3 className="text-sm font-semibold text-[#0f2233]">
                    Escenario definido por usuario
                </h3>
                <p className="mt-1 text-xs text-surface-600">
                    Edita tu ingreso adicional y recalculamos en tiempo real el escenario.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                    <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                        <p className="text-surface-500">Ingreso adicional (editable)</p>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="text-surface-500">{currency}</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={additionalIncomeInput}
                                onChange={(event) =>
                                    setAdditionalIncomeInput(event.target.value)
                                }
                                className="input-field h-8 bg-white text-xs"
                            />
                        </div>
                    </div>
                    <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                        <p className="text-surface-500">Ingreso total escenario</p>
                        <p className="mt-1 font-semibold text-[#0f2233]">
                            {formatMoney(scenarioIncome, currency)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                        <p className="text-surface-500">Ahorro mensual escenario</p>
                        <p className="mt-1 font-semibold text-[#0f2233]">
                            {formatMoney(scenarioSavingsPool, currency)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-[#d9e2f0] bg-white px-3 py-2">
                        <p className="text-surface-500">
                            Faltante vs ingreso recomendado
                        </p>
                        <p className="mt-1 font-semibold text-[#0f2233]">
                            {formatMoney(incomeGapToTarget, currency)}
                        </p>
                    </div>
                </div>
            </article>

            {scenarioGoalRows.length > 0 ? (
                <article className="mt-4 rounded-xl border border-[#d9e2f0] bg-white p-4">
                    <h3 className="text-sm font-semibold text-[#0f2233]">Metas evaluadas</h3>
                    <p className="mt-1 text-xs text-surface-600">
                        Aclaracion: <b>Faltante mensual</b> = aporte requerido - aporte estimado con
                        tu escenario. No es dinero que te sobra.
                    </p>

                    <div className="mt-3 overflow-x-auto rounded-lg border border-[#d9e2f0]">
                        <table className="w-full min-w-[920px] text-sm">
                            <thead className="bg-[#f5f9ff] text-left text-surface-500">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Meta</th>
                                    <th className="px-3 py-2 font-semibold">Horizonte</th>
                                    <th className="px-3 py-2 font-semibold">Aporte actual</th>
                                    <th className="px-3 py-2 font-semibold">Aporte requerido</th>
                                    <th className="px-3 py-2 font-semibold">
                                        Aporte con escenario
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Faltante mensual
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e8eef7] bg-white">
                                {scenarioGoalRows.map((goal) => (
                                    <tr key={goal.id}>
                                        <td className="px-3 py-2 font-medium text-[#0f2233]">
                                            {goal.name}
                                        </td>
                                        <td className="px-3 py-2 text-surface-600">
                                            {formatHorizonLabel(goal.target_months)}
                                        </td>
                                        <td className="px-3 py-2 text-surface-600">
                                            {formatMoney(
                                                goal.projected_monthly_contribution,
                                                currency
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-surface-600">
                                            {formatMoney(
                                                goal.required_monthly_contribution,
                                                currency
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-surface-600">
                                            {formatMoney(goal.scenarioContribution, currency)}
                                        </td>
                                        <td
                                            className={`px-3 py-2 font-semibold ${
                                                goal.monthlyShortfall > 0
                                                    ? "text-negative-600"
                                                    : "text-positive-600"
                                            }`}
                                        >
                                            {formatMoney(goal.monthlyShortfall, currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </article>
            ) : null}
        </>
    );
}

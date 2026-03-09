"use client";

import { useState } from "react";
import { type FinancialProfileInput, updateFinancialProfile } from "@/app/actions/settings";
import { SpinnerIcon } from "@/components/ui/icons";

export function FinancialProfileForm({ initialData }: { initialData: FinancialProfileInput }) {
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const [monthlyIncomeNet, setMonthlyIncomeNet] = useState(String(initialData.monthly_income_net));
    const [salaryFrequency, setSalaryFrequency] = useState(initialData.salary_frequency || "monthly");
    const [salaryPaymentDay1, setSalaryPaymentDay1] = useState(String(initialData.salary_payment_day_1 || 30));
    const [salaryPaymentDay2, setSalaryPaymentDay2] = useState(String(initialData.salary_payment_day_2 || 15));
    const [firstFortnightAmount, setFirstFortnightAmount] = useState(String(initialData.first_fortnight_amount || ""));
    const [secondFortnightAmount, setSecondFortnightAmount] = useState(String(initialData.second_fortnight_amount || ""));

    const [hasAdditionalIncome, setHasAdditionalIncome] = useState((initialData.additional_income || 0) > 0);
    const [additionalIncome, setAdditionalIncome] = useState(String(initialData.additional_income || 0));

    const [sharesFinances, setSharesFinances] = useState((initialData.partner_contribution || 0) > 0);
    const [partnerContribution, setPartnerContribution] = useState(String(initialData.partner_contribution || 0));
    const [partnerSalaryFrequency, setPartnerSalaryFrequency] = useState(initialData.partner_salary_frequency || "monthly");
    const [partnerSalaryPaymentDay1, setPartnerSalaryPaymentDay1] = useState(String(initialData.partner_salary_payment_day_1 || 30));
    const [partnerSalaryPaymentDay2, setPartnerSalaryPaymentDay2] = useState(String(initialData.partner_salary_payment_day_2 || 15));
    const [partnerFirstFortnightAmount, setPartnerFirstFortnightAmount] = useState(String(initialData.partner_first_fortnight_amount || ""));
    const [partnerSecondFortnightAmount, setPartnerSecondFortnightAmount] = useState(String(initialData.partner_second_fortnight_amount || ""));

    const [distributionRule, setDistributionRule] = useState<"50_30_20" | "70_20_10" | "80_20" | "custom">(initialData.distribution_rule);
    const [customNeedsPct, setCustomNeedsPct] = useState(String(initialData.needs_pct));
    const [customWantsPct, setCustomWantsPct] = useState(String(initialData.wants_pct));
    const [customSavingsPct, setCustomSavingsPct] = useState(String(initialData.savings_pct));
    const [customDebtPct, setCustomDebtPct] = useState(String(initialData.debt_pct));

    // Fix the savings_priorities type mismatch by explicitly typing the initial state
    type PriorityType = "fixed_expenses" | "debt_payments" | "savings_goals";
    const [savingsPriorities, setSavingsPriorities] = useState<PriorityType[]>(
        (initialData.savings_priorities || ["fixed_expenses", "debt_payments", "savings_goals"]) as PriorityType[]
    );

    const togglePriority = (priority: PriorityType) => {
        setSavingsPriorities(prev => {
            if (prev.includes(priority)) {
                if (prev.length === 1) return prev;
                return prev.filter(p => p !== priority);
            }
            if (prev.length >= 3) return prev;
            return [...prev, priority];
        });
    };

    const handleApplyPreset = (rule: "50_30_20" | "70_20_10" | "80_20") => {
        setDistributionRule(rule);
        if (rule === "50_30_20") {
            setCustomNeedsPct("50"); setCustomWantsPct("30"); setCustomSavingsPct("20"); setCustomDebtPct("0");
        } else if (rule === "70_20_10") {
            setCustomNeedsPct("70"); setCustomWantsPct("0"); setCustomSavingsPct("20"); setCustomDebtPct("10");
        } else if (rule === "80_20") {
            setCustomNeedsPct("80"); setCustomWantsPct("0"); setCustomSavingsPct("20"); setCustomDebtPct("0");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const data: FinancialProfileInput = {
                monthly_income_net: Number(monthlyIncomeNet) || 0,
                additional_income: hasAdditionalIncome ? Number(additionalIncome) : 0,
                partner_contribution: sharesFinances ? Number(partnerContribution) : 0,
                salary_frequency: salaryFrequency,
                salary_payment_day_1: Number(salaryPaymentDay1) || undefined,
                salary_payment_day_2: Number(salaryPaymentDay2) || undefined,
                first_fortnight_amount: Number(firstFortnightAmount) || undefined,
                second_fortnight_amount: Number(secondFortnightAmount) || undefined,
                partner_salary_frequency: partnerSalaryFrequency,
                partner_salary_payment_day_1: Number(partnerSalaryPaymentDay1) || undefined,
                partner_salary_payment_day_2: Number(partnerSalaryPaymentDay2) || undefined,
                partner_first_fortnight_amount: Number(partnerFirstFortnightAmount) || undefined,
                partner_second_fortnight_amount: Number(partnerSecondFortnightAmount) || undefined,
                distribution_rule: distributionRule,
                needs_pct: Number(customNeedsPct) || 0,
                wants_pct: Number(customWantsPct) || 0,
                savings_pct: Number(customSavingsPct) || 0,
                debt_pct: Number(customDebtPct) || 0,
                savings_priorities: savingsPriorities,
            };

            const result = await updateFinancialProfile(data);
            if (result.error) {
                setErrorMsg(result.error);
            } else {
                setSuccessMsg("¡Perfil financiero actualizado con éxito!");
                setTimeout(() => setSuccessMsg(""), 3000);
            }
        } catch (err) {
            setErrorMsg("Ocurrió un error inesperado al guardar el perfil.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
            {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm">
                    ⚠️ {errorMsg}
                </div>
            )}
            {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
                    ✅ {successMsg}
                </div>
            )}

            {/* INGRESOS PERSONALES */}
            <div>
                <h4 className="border-b border-surface-200 pb-2 text-sm font-semibold text-[#0f2233] uppercase">Ingresos Personales</h4>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-surface-700">Frecuencia de salario</label>
                        <select
                            value={salaryFrequency}
                            onChange={(e) => setSalaryFrequency(e.target.value as "monthly" | "biweekly")}
                            className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233] focus:border-[#0d4c7a] focus:ring-1 focus:ring-[#0d4c7a]/20"
                        >
                            <option value="monthly">Mensual (1 pago)</option>
                            <option value="biweekly">Quincenal (2 pagos)</option>
                        </select>
                    </div>

                    {salaryFrequency === "monthly" ? (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-surface-700">Día de pago</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={salaryPaymentDay1}
                                    onChange={(e) => setSalaryPaymentDay1(e.target.value)}
                                    className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233] focus:border-[#0d4c7a] focus:ring-1 focus:ring-[#0d4c7a]/20"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-surface-700">Sueldo neto (mensual)</label>
                                <input
                                    type="number"
                                    value={monthlyIncomeNet}
                                    onChange={(e) => setMonthlyIncomeNet(e.target.value)}
                                    className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233] focus:border-[#0d4c7a] focus:ring-1 focus:ring-[#0d4c7a]/20"
                                    placeholder="0.00"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
                            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                                <h5 className="mb-3 text-xs font-semibold text-surface-600">Primera Quincena</h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-surface-700">Día de pago</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={salaryPaymentDay2}
                                            onChange={(e) => setSalaryPaymentDay2(e.target.value)}
                                            className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-surface-700">Monto</label>
                                        <input
                                            type="number"
                                            value={firstFortnightAmount}
                                            onChange={(e) => setFirstFortnightAmount(e.target.value)}
                                            className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                                <h5 className="mb-3 text-xs font-semibold text-surface-600">Segunda Quincena</h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-surface-700">Día de pago</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={salaryPaymentDay1}
                                            onChange={(e) => setSalaryPaymentDay1(e.target.value)}
                                            className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-surface-700">Monto</label>
                                        <input
                                            type="number"
                                            value={secondFortnightAmount}
                                            onChange={(e) => setSecondFortnightAmount(e.target.value)}
                                            className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-[#0f2233] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasAdditionalIncome}
                            onChange={(e) => setHasAdditionalIncome(e.target.checked)}
                            className="h-4 w-4 rounded border-surface-300 text-[#0d4c7a] focus:ring-[#0d4c7a]"
                        />
                        Tengo ingresos adicionales fijos (Freelance, alquileres, etc.)
                    </label>
                    {hasAdditionalIncome && (
                        <div className="pl-6">
                            <label className="mb-1 block text-sm font-medium text-surface-700">Monto adicional mensual</label>
                            <input
                                type="number"
                                value={additionalIncome}
                                onChange={(e) => setAdditionalIncome(e.target.value)}
                                className="w-full max-w-md rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* APORTES DE PAREJA */}
            <div>
                <h4 className="border-b border-surface-200 pb-2 text-sm font-semibold text-[#0f2233] uppercase">Ingresos Compartidos</h4>
                <div className="mt-4 space-y-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-[#0f2233] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={sharesFinances}
                            onChange={(e) => setSharesFinances(e.target.checked)}
                            className="h-4 w-4 rounded border-surface-300 text-[#0d4c7a] focus:ring-[#0d4c7a]"
                        />
                        Comparto finanzas con mi pareja
                    </label>

                    {sharesFinances && (
                        <div className="pl-6 grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-surface-700">Frecuencia de aporte de tu pareja</label>
                                <select
                                    value={partnerSalaryFrequency}
                                    onChange={(e) => setPartnerSalaryFrequency(e.target.value as "monthly" | "biweekly")}
                                    className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                >
                                    <option value="monthly">Mensual (1 pago)</option>
                                    <option value="biweekly">Quincenal (2 pagos)</option>
                                </select>
                            </div>

                            {partnerSalaryFrequency === "monthly" ? (
                                <>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-surface-700">Día de aporte</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={partnerSalaryPaymentDay1}
                                            onChange={(e) => setPartnerSalaryPaymentDay1(e.target.value)}
                                            className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-surface-700">Monto de aporte (mensual)</label>
                                        <input
                                            type="number"
                                            value={partnerContribution}
                                            onChange={(e) => setPartnerContribution(e.target.value)}
                                            className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
                                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                                        <h5 className="mb-3 text-xs font-semibold text-surface-600">Primera Quincena (Pareja)</h5>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-surface-700">Día de pago</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="31"
                                                    value={partnerSalaryPaymentDay2}
                                                    onChange={(e) => setPartnerSalaryPaymentDay2(e.target.value)}
                                                    className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-surface-700">Monto</label>
                                                <input
                                                    type="number"
                                                    value={partnerFirstFortnightAmount}
                                                    onChange={(e) => setPartnerFirstFortnightAmount(e.target.value)}
                                                    className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                                        <h5 className="mb-3 text-xs font-semibold text-surface-600">Segunda Quincena (Pareja)</h5>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-surface-700">Día de pago</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="31"
                                                    value={partnerSalaryPaymentDay1}
                                                    onChange={(e) => setPartnerSalaryPaymentDay1(e.target.value)}
                                                    className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-surface-700">Monto</label>
                                                <input
                                                    type="number"
                                                    value={partnerSecondFortnightAmount}
                                                    onChange={(e) => setPartnerSecondFortnightAmount(e.target.value)}
                                                    className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* REGLAS DE DISTRIBUCIÓN */}
            <div>
                <h4 className="border-b border-surface-200 pb-2 text-sm font-semibold text-[#0f2233] uppercase">Lógica Financiera</h4>
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-surface-700 mb-2">Regla de Distribución</label>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => handleApplyPreset("50_30_20")} className={`px-4 py-2 text-sm font-medium rounded-xl border ${distributionRule === "50_30_20" ? "border-[#0d4c7a] bg-[#0d4c7a] text-white" : "border-surface-300 bg-white text-surface-600 hover:bg-surface-50"}`}>50/30/20</button>
                            <button type="button" onClick={() => handleApplyPreset("70_20_10")} className={`px-4 py-2 text-sm font-medium rounded-xl border ${distributionRule === "70_20_10" ? "border-[#0d4c7a] bg-[#0d4c7a] text-white" : "border-surface-300 bg-white text-surface-600 hover:bg-surface-50"}`}>70/20/10</button>
                            <button type="button" onClick={() => handleApplyPreset("80_20")} className={`px-4 py-2 text-sm font-medium rounded-xl border ${distributionRule === "80_20" ? "border-[#0d4c7a] bg-[#0d4c7a] text-white" : "border-surface-300 bg-white text-surface-600 hover:bg-surface-50"}`}>80/20</button>
                            <button type="button" onClick={() => setDistributionRule("custom")} className={`px-4 py-2 text-sm font-medium rounded-xl border ${distributionRule === "custom" ? "border-[#0d4c7a] bg-[#0d4c7a] text-white" : "border-surface-300 bg-white text-surface-600 hover:bg-surface-50"}`}>Personalizada</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-surface-500">Gastos básicos / Fijos (%)</label>
                            <input type="number" value={customNeedsPct} onChange={e => { setCustomNeedsPct(e.target.value); setDistributionRule("custom"); }} className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-surface-500">Deseos / Opcional (%)</label>
                            <input type="number" value={customWantsPct} onChange={e => { setCustomWantsPct(e.target.value); setDistributionRule("custom"); }} className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-surface-500">Ahorro (%)</label>
                            <input type="number" value={customSavingsPct} onChange={e => { setCustomSavingsPct(e.target.value); setDistributionRule("custom"); }} className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase text-surface-500">Deuda / Otros (%)</label>
                            <input type="number" value={customDebtPct} onChange={e => { setCustomDebtPct(e.target.value); setDistributionRule("custom"); }} className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-sm text-[#0f2233]" />
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <label className="block text-sm font-medium text-surface-700 mb-2">Prioridades de liquidez adicionales</label>
                    <p className="text-xs text-surface-500 mb-4">Selecciona hasta 3 enfoques que priorizará el Asistente en caso de déficit de liquidez temporal.</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => togglePriority("fixed_expenses")} className={`px-4 py-2 text-sm font-medium rounded-xl border ${savingsPriorities.includes("fixed_expenses") ? "border-[#117068] bg-[#e8f8f0] text-[#117068]" : "border-surface-300 bg-white text-surface-600"}`}>🛡️ Gastos Fijos</button>
                        <button type="button" onClick={() => togglePriority("debt_payments")} className={`px-4 py-2 text-sm font-medium rounded-xl border ${savingsPriorities.includes("debt_payments") ? "border-[#117068] bg-[#e8f8f0] text-[#117068]" : "border-surface-300 bg-white text-surface-600"}`}>📉 Pagar Deudas</button>
                        <button type="button" onClick={() => togglePriority("savings_goals")} className={`px-4 py-2 text-sm font-medium rounded-xl border ${savingsPriorities.includes("savings_goals") ? "border-[#117068] bg-[#e8f8f0] text-[#117068]" : "border-surface-300 bg-white text-surface-600"}`}>🎯 Metas de Ahorro</button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-surface-200">
                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary inline-flex w-full justify-center sm:w-auto min-w-[160px]"
                >
                    {loading ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : "Guardar Perfil Financiero"}
                </button>
            </div>
        </form>
    );
}

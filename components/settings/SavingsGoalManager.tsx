"use client";

import { useState } from "react";
import { type SavingsGoalInput, upsertSavingsGoal, deleteSavingsGoal } from "@/app/actions/settings";
import { Plus, Loader2 as SpinnerIcon } from "lucide-react";

export function SavingsGoalManager({
    initialGoals,
    defaultCurrency = "PEN"
}: {
    initialGoals: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultCurrency?: string;
}) {
    const [goals, setGoals] = useState(initialGoals);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form state
    const [id, setId] = useState<string | undefined>(undefined);
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [deadlineDate, setDeadlineDate] = useState("");
    const [goalWeight, setGoalWeight] = useState("1");

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: defaultCurrency }).format(amount);
    };

    const handleEdit = (goal: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setId(goal.id);
        setName(goal.name);
        setTargetAmount(String(goal.target_amount || ""));
        setDeadlineDate(goal.deadline_date || "");
        setGoalWeight(String(goal.goal_weight || 1));
        setIsEditing(true);
        setErrorMsg("");
    };

    const handleCancel = () => {
        setIsEditing(false);
        setErrorMsg("");
        setId(undefined);
        setName("");
        setTargetAmount("");
        setDeadlineDate("");
        setGoalWeight("1");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const data: SavingsGoalInput = {
                id,
                name: name.trim(),
                target_amount: Number(targetAmount) || 0,
                deadline_date: deadlineDate || null,
                goal_weight: Number(goalWeight) || 1,
            };

            const result = await upsertSavingsGoal(data);
            if (result.error) {
                setErrorMsg(result.error);
                return;
            }

            // Update local state optimistic
            if (id) {
                setGoals(goals.map(g => g.id === id ? { ...g, ...data, target_amount: data.target_amount, deadline_date: data.deadline_date, goal_weight: data.goal_weight } : g));
            } else {
                setGoals([...goals, { ...data, id: "temp-" + Date.now(), current_amount: 0, target_amount: data.target_amount, deadline_date: data.deadline_date, goal_weight: data.goal_weight }]);
            }

            handleCancel();
        } catch {
            setErrorMsg("Error inesperado al guardar la meta");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (goalId: string) => {
        if (!confirm("¿Eliminar esta meta de ahorro?")) return;

        const result = await deleteSavingsGoal(goalId);
        if (result.error) {
            alert(result.error);
            return;
        }
        setGoals(goals.filter(g => g.id !== goalId));
    };

    return (
        <div className="space-y-4">
            {goals.length === 0 && !isEditing ? (
                <div className="text-center py-6 border border-dashed border-surface-200 rounded-xl bg-surface-50">
                    <p className="text-sm text-surface-500 font-medium">No tienes metas de ahorro registradas</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {goals.map(goal => (
                        <div key={goal.id} className="flex items-center justify-between p-3 border border-surface-200 rounded-xl bg-white hover:border-[#0d4c7a]/30 transition-colors">
                            <div>
                                <h5 className="text-sm font-semibold text-[#0f2233]">
                                    {goal.name}
                                </h5>
                                <div className="mt-1 text-xs text-surface-500 font-medium space-x-3">
                                    <span>Objetivo: {formatMoney(goal.target_amount)}</span>
                                    <span>Avance: {formatMoney(goal.current_amount || 0)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleEdit(goal)} className="text-xs font-semibold text-[#1d4ed8] hover:underline">Editar</button>
                                <button type="button" onClick={() => handleDelete(goal.id)} className="text-xs font-semibold text-negative-600 hover:underline">Borrar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isEditing ? (
                <button
                    type="button"
                    onClick={() => { handleCancel(); setIsEditing(true); }}
                    className="btn-secondary w-full text-sm inline-flex justify-center"
                >
                    <Plus size={16} className="mr-1.5" /> Agregar meta
                </button>
            ) : (
                <form onSubmit={handleSave} className="p-4 border border-[#d9e2f0] rounded-xl bg-[#f8fbff] space-y-4 animate-fade-in relative">
                    <h5 className="text-sm font-semibold text-[#0f2233]">{id ? "Editar meta" : "Nueva meta"}</h5>

                    {errorMsg && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Nombre de la meta</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. Fondo de emergencia"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Monto objetivo</label>
                            <input
                                required
                                type="number"
                                min="1"
                                step="any"
                                value={targetAmount}
                                onChange={e => setTargetAmount(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. 5000"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Fecha límite (Opcional)</label>
                            <input
                                type="date"
                                value={deadlineDate}
                                onChange={e => setDeadlineDate(e.target.value)}
                                className="form-input w-full text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Prioridad / Peso</label>
                            <input
                                required
                                type="number"
                                min="1"
                                max="10"
                                value={goalWeight}
                                onChange={e => setGoalWeight(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. 1"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="submit" disabled={loading} className="btn-primary text-sm flex-1">
                            {loading ? <SpinnerIcon className="animate-spin relative top-[2px]" /> : "Guardar"}
                        </button>
                        <button type="button" disabled={loading} onClick={handleCancel} className="btn-secondary text-sm flex-1">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

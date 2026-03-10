"use client";

import { useState } from "react";
import { type SubscriptionInput, upsertSubscription, deleteSubscription } from "@/app/actions/settings";
import { Plus, Loader2 as SpinnerIcon } from "lucide-react";

export function SubscriptionManager({
    initialSubscriptions,
    defaultCurrency = "PEN"
}: {
    initialSubscriptions: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultCurrency?: string;
}) {
    const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form state
    const [id, setId] = useState<string | undefined>(undefined);
    const [name, setName] = useState("");
    const [monthlyCost, setMonthlyCost] = useState("");
    const [billingDay, setBillingDay] = useState("1");

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: defaultCurrency }).format(amount);
    };

    const handleEdit = (sub: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setId(sub.id);
        setName(sub.name);
        setMonthlyCost(String(sub.monthlyCost || ""));
        setBillingDay(String(sub.billingDay || 1));
        setIsEditing(true);
        setErrorMsg("");
    };

    const handleCancel = () => {
        setIsEditing(false);
        setErrorMsg("");
        setId(undefined);
        setName("");
        setMonthlyCost("");
        setBillingDay("1");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const data: SubscriptionInput = {
                id,
                name: name.trim(),
                monthlyCost: Number(monthlyCost) || 0,
                billingDay: Number(billingDay) || 1,
            };

            const result = await upsertSubscription(data);
            if (result.error) {
                setErrorMsg(result.error);
                return;
            }

            // Update local state optimistic
            if (id) {
                setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, ...data } : s));
            } else {
                setSubscriptions([...subscriptions, { ...data, id: "temp-" + Date.now() }]);
            }

            handleCancel();
        } catch {
            setErrorMsg("Error inesperado al guardar la suscripción");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (subId: string) => {
        if (!confirm("¿Eliminar esta suscripción?")) return;

        const result = await deleteSubscription(subId);
        if (result.error) {
            alert(result.error);
            return;
        }
        setSubscriptions(subscriptions.filter(s => s.id !== subId));
    };

    return (
        <div className="space-y-4">
            {subscriptions.length === 0 && !isEditing ? (
                <div className="text-center py-6 border border-dashed border-surface-200 rounded-xl bg-surface-50">
                    <p className="text-sm text-surface-500 font-medium">No tienes suscripciones registradas</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {subscriptions.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-3 border border-surface-200 rounded-xl bg-white hover:border-[#0d4c7a]/30 transition-colors">
                            <div>
                                <h5 className="text-sm font-semibold text-[#0f2233] flex items-center gap-2">
                                    {sub.name}
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">Día {sub.billingDay}</span>
                                </h5>
                                <div className="mt-1 text-xs text-surface-500 font-medium">
                                    {formatMoney(sub.monthlyCost)} / mes
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleEdit(sub)} className="text-xs font-semibold text-[#1d4ed8] hover:underline">Editar</button>
                                <button type="button" onClick={() => handleDelete(sub.id)} className="text-xs font-semibold text-negative-600 hover:underline">Borrar</button>
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
                    <Plus size={16} className="mr-1.5" /> Agregar suscripción
                </button>
            ) : (
                <form onSubmit={handleSave} className="p-4 border border-[#d9e2f0] rounded-xl bg-[#f8fbff] space-y-4 animate-fade-in relative">
                    <h5 className="text-sm font-semibold text-[#0f2233]">{id ? "Editar suscripción" : "Nueva suscripción"}</h5>

                    {errorMsg && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Nombre de servicio</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. Netflix"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Costo mensual</label>
                            <input
                                required
                                type="number"
                                min="1"
                                step="any"
                                value={monthlyCost}
                                onChange={e => setMonthlyCost(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. 35.90"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Día de cobro</label>
                            <input
                                required
                                type="number"
                                min="1"
                                max="31"
                                value={billingDay}
                                onChange={e => setBillingDay(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. 15"
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

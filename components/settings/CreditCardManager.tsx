"use client";

import { useState } from "react";
import { type CreditCardInput, upsertCreditCard, deleteCreditCard } from "@/app/actions/settings";
import { Plus, Trash2 as TrashIcon, Loader2 as SpinnerIcon } from "lucide-react";

export function CreditCardManager({
    initialCards,
    defaultCurrency = "PEN"
}: {
    initialCards: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultCurrency?: string;
}) {
    const [cards, setCards] = useState(initialCards);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Form state
    const [id, setId] = useState<string | undefined>(undefined);
    const [name, setName] = useState("");
    const [currency, setCurrency] = useState(defaultCurrency);
    const [creditLimit, setCreditLimit] = useState("");
    const [currentBalance, setCurrentBalance] = useState("");
    const [paymentDay, setPaymentDay] = useState("30");
    const [paymentStrategy, setPaymentStrategy] = useState<"full" | "minimum" | "fixed">("full");

    const formatMoney = (amount: number, cur: string) => {
        return new Intl.NumberFormat("es-PE", { style: "currency", currency: cur }).format(amount);
    };

    const handleEdit = (card: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setId(card.id);
        setName(card.name);
        setCurrency(card.currency || defaultCurrency);
        setCreditLimit(String(card.credit_limit || ""));
        setCurrentBalance(String(card.current_balance || ""));
        setPaymentDay(String(card.payment_day || 30));
        setPaymentStrategy(card.card_payment_strategy || "full");
        setIsEditing(true);
        setErrorMsg("");
    };

    const handleCancel = () => {
        setIsEditing(false);
        setErrorMsg("");
        setId(undefined);
        setName("");
        setCreditLimit("");
        setCurrentBalance("");
        setPaymentDay("30");
        setPaymentStrategy("full");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const data: CreditCardInput = {
                id,
                name: name.trim(),
                currency,
                credit_limit: Number(creditLimit) || 0,
                current_balance: Number(currentBalance) || 0,
                payment_day: Number(paymentDay) || 30,
                card_payment_strategy: paymentStrategy,
                minimum_payment_amount: 0,
                tea: 0,
                has_desgravamen: false,
                desgravamen_amount: 0,
            };

            const result = await upsertCreditCard(data);
            if (result.error) {
                setErrorMsg(result.error);
                return;
            }

            // Update local state optimistic
            if (id) {
                setCards(cards.map(c => c.id === id ? { ...c, ...data, credit_limit: data.credit_limit, current_balance: data.current_balance, payment_day: data.payment_day, card_payment_strategy: data.card_payment_strategy } : c));
            } else {
                setCards([...cards, { ...data, id: "temp-" + Date.now(), credit_limit: data.credit_limit, current_balance: data.current_balance, payment_day: data.payment_day, card_payment_strategy: data.card_payment_strategy }]);
            }

            handleCancel();
        } catch {
            setErrorMsg("Error inesperado al guardar la tarjeta");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cardId: string) => {
        if (!confirm("¿Eliminar esta tarjeta? Esta acción no se puede deshacer.")) return;

        const result = await deleteCreditCard(cardId);
        if (result.error) {
            alert(result.error);
            return;
        }
        setCards(cards.filter(c => c.id !== cardId));
    };

    return (
        <div className="space-y-4">
            {cards.length === 0 && !isEditing ? (
                <div className="text-center py-6 border border-dashed border-surface-200 rounded-xl bg-surface-50">
                    <p className="text-sm text-surface-500 font-medium">No tienes tarjetas registradas</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {cards.map(card => (
                        <div key={card.id} className="flex items-center justify-between p-3 border border-surface-200 rounded-xl bg-white hover:border-[#0d4c7a]/30 transition-colors">
                            <div>
                                <h5 className="text-sm font-semibold text-[#0f2233] flex items-center gap-2">
                                    {card.name}
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">Día {card.payment_day}</span>
                                </h5>
                                <div className="mt-1 text-xs text-surface-500 font-medium space-x-3">
                                    <span>Límite: {formatMoney(card.credit_limit, card.currency)}</span>
                                    <span>Deuda actual: {formatMoney(card.current_balance, card.currency)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleEdit(card)} className="text-xs font-semibold text-[#1d4ed8] hover:underline">Editar</button>
                                <button type="button" onClick={() => handleDelete(card.id)} className="text-xs font-semibold text-negative-600 hover:underline">Borrar</button>
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
                    <Plus size={16} className="mr-1.5" /> Agregar tarjeta
                </button>
            ) : (
                <form onSubmit={handleSave} className="p-4 border border-[#d9e2f0] rounded-xl bg-[#f8fbff] space-y-4 animate-fade-in relative">
                    <h5 className="text-sm font-semibold text-[#0f2233]">{id ? "Editar tarjeta" : "Nueva tarjeta"}</h5>

                    {errorMsg && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{errorMsg}</div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Nombre de tarjeta</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. Visa Signature BCP"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Moneda</label>
                            <select value={currency} onChange={e => setCurrency(e.target.value)} className="form-select w-full text-sm">
                                <option value="PEN">Soles (PEN)</option>
                                <option value="USD">Dólares (USD)</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Línea de crédito</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={creditLimit}
                                onChange={e => setCreditLimit(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. 10000"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Deuda actual (saldo)</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={currentBalance}
                                onChange={e => setCurrentBalance(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. 1500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Día de pago</label>
                            <input
                                required
                                type="number"
                                min="1"
                                max="31"
                                value={paymentDay}
                                onChange={e => setPaymentDay(e.target.value)}
                                className="form-input w-full text-sm"
                                placeholder="Ej. 5"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-surface-600">Estrategia de pago</label>
                            <select value={paymentStrategy} onChange={e => setPaymentStrategy(e.target.value as "full" | "minimum" | "fixed")} className="form-select w-full text-sm">
                                <option value="full">Pago total (recomendado)</option>
                                <option value="fixed">Pago fijo</option>
                                <option value="minimum">Pago mínimo</option>
                            </select>
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

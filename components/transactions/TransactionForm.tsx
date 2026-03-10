"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { createTransaction, createTransactionsBatch, updateTransaction } from "@/app/actions/transactions";
import { processGamificationAction } from "@/app/actions/gamification";
import { updateChallengeProgress } from "@/app/actions/challenges";
import { interactWithPet } from "@/app/actions/pets";
import { Select } from "@/components/ui/Select";
import { Account, CategoryGL } from "@/lib/types/finance";

interface TransactionFormInitialValues {
    date: string;
    description: string;
    amount: number;
    account_id: string;
    category_gl_id?: string | null;
    currency?: string | null;
    notes?: string | null;
    savings_goal_id?: string | null;
}

interface TransactionFormProps {
    accounts: Account[];
    categories: CategoryGL[];
    savingsGoals?: { id: string; name: string; target_amount: number }[];
    mode?: "create" | "edit";
    transactionId?: string;
    initialValues?: TransactionFormInitialValues;
}

interface ExtractedTransactionDraft {
    date: string;
    description: string;
    amount: number;
    direction: "income" | "expense";
    currency: string;
    account_id: string;
    account_name?: string | null;
    category_gl_id?: string;
    category_name?: string | null;
    notes?: string;
    confidence: number;
    ready_to_save: boolean;
}

interface ExtractDocumentResponse {
    success?: boolean;
    error?: string;
    warnings?: string[];
    mode?: "single" | "multi";
    extracted?: ExtractedTransactionDraft;
    extracted_items?: ExtractedTransactionDraft[];
    total_detected?: number;
    ready_to_save_count?: number;
}

function toInputDate(value?: string) {
    if (!value) return new Date().toISOString().slice(0, 10);
    return value.slice(0, 10);
}

export function TransactionForm({
    accounts,
    categories,
    savingsGoals,
    mode = "create",
    transactionId,
    initialValues,
}: TransactionFormProps) {
    const router = useRouter();
    const documentInputRef = useRef<HTMLInputElement>(null);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [direction, setDirection] = useState<"expense" | "income">(() => {
        if (!initialValues) return "expense";
        return initialValues.amount >= 0 ? "income" : "expense";
    });
    const [amount, setAmount] = useState(
        initialValues ? String(Math.abs(initialValues.amount)) : ""
    );
    const [description, setDescription] = useState(initialValues?.description ?? "");
    const [date, setDate] = useState(toInputDate(initialValues?.date));
    const [accountId, setAccountId] = useState(
        initialValues?.account_id || accounts[0]?.id || ""
    );
    const [categoryId, setCategoryId] = useState(initialValues?.category_gl_id ?? "");
    const [savingsGoalId, setSavingsGoalId] = useState(initialValues?.savings_goal_id ?? "");
    const [notes, setNotes] = useState(initialValues?.notes ?? "");

    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [scanPending, setScanPending] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scanNotice, setScanNotice] = useState<string | null>(null);
    const [autoCreateFromDocument, setAutoCreateFromDocument] = useState(true);
    const [multiMovementMode, setMultiMovementMode] = useState(false);
    const [batchPending, setBatchPending] = useState(false);
    const [extractedDraft, setExtractedDraft] = useState<ExtractedTransactionDraft | null>(null);
    const [extractedItems, setExtractedItems] = useState<ExtractedTransactionDraft[]>([]);

    const selectedAccountCurrency = useMemo(() => {
        const accountCurrency = accounts.find((account) => account.id === accountId)?.currency;
        return (accountCurrency || initialValues?.currency || accounts[0]?.currency || "USD").toUpperCase();
    }, [accountId, accounts, initialValues?.currency]);

    const pageTitle = mode === "edit" ? "Editar movimiento" : "Registrar movimiento";
    const submitLabel = mode === "edit" ? "Guardar cambios" : "Crear transacción";

    const filteredCategories = useMemo(
        () =>
            categories.filter((category) => {
                if (direction === "income") {
                    return ["revenue", "other_income", "income"].includes(category.kind);
                }
                return !["revenue", "other_income", "income"].includes(category.kind);
            }),
        [categories, direction]
    );

    const readyExtractedItems = useMemo(
        () => extractedItems.filter((item) => item.ready_to_save),
        [extractedItems]
    );

    function resolveCurrencyByAccountId(accountIdValue: string, fallbackCurrency?: string | null) {
        const accountCurrency = accounts.find((account) => account.id === accountIdValue)?.currency;
        return (accountCurrency || fallbackCurrency || selectedAccountCurrency || "USD").toUpperCase();
    }

    function buildPayloadFromValues(values: {
        directionValue: "income" | "expense";
        amountValue: string;
        descriptionValue: string;
        dateValue: string;
        accountIdValue: string;
        categoryIdValue?: string;
        savingsGoalIdValue?: string;
        notesValue?: string;
        currencyHint?: string | null;
    }) {
        const numericAmount = Number(values.amountValue);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            throw new Error("Ingresa un monto válido.");
        }

        if (!values.accountIdValue) {
            throw new Error("Selecciona una cuenta.");
        }

        const normalizedDescription = values.descriptionValue.trim();
        if (!normalizedDescription) {
            throw new Error("Ingresa una descripción del movimiento.");
        }

        return {
            date: values.dateValue,
            description: normalizedDescription,
            amount:
                values.directionValue === "expense"
                    ? -numericAmount
                    : numericAmount,
            account_id: values.accountIdValue,
            category_gl_id: values.categoryIdValue || undefined,
            currency: resolveCurrencyByAccountId(values.accountIdValue, values.currencyHint),
            is_transfer: false,
            counterparty_id: undefined,
            cost_center_id: undefined,
            transfer_group_id: undefined,
            savings_goal_id:
                values.directionValue === "expense" && values.savingsGoalIdValue
                    ? values.savingsGoalIdValue
                    : undefined,
            detraccion_rate: undefined,
            detraccion_amount: undefined,
            notes: values.notesValue?.trim() || undefined,
            tax_amount: undefined,
        };
    }

    async function persistTransaction(payload: ReturnType<typeof buildPayloadFromValues>) {
        const result =
            mode === "edit" && transactionId
                ? await updateTransaction(transactionId, payload)
                : await createTransaction(payload);

        if (result.error) {
            throw new Error(result.error);
        }

        let leveledUp = false;
        try {
            const isConstructive = payload.amount >= 0 || !!payload.savings_goal_id;
            const amountSaved = Math.abs(payload.amount);

            // Sync gamification in background
            Promise.all([
                updateChallengeProgress(amountSaved, isConstructive),
                interactWithPet(isConstructive ? 'save_money' : 'feed')
            ]).catch(e => console.error("Error updating challenges/pet:", e));

            const gamificationResult = await processGamificationAction("transaction");
            if (gamificationResult?.leveledUp) {
                leveledUp = true;
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("showLevelUpPopup", { detail: { level: gamificationResult.current_level } }));
                }
            } else {
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("showCashflowPopup", { detail: { type: "streak" } }));
                }
            }
        } catch (e) {
            console.error("Gamification error", e);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("showCashflowPopup", { detail: { type: "streak" } }));
            }
        }

        setTimeout(() => {
            router.push("/dashboard/transactions");
            router.refresh();
        }, leveledUp ? 4000 : 1800);
    }

    async function persistExtractedBatch(drafts: ExtractedTransactionDraft[]) {
        const payloads = drafts
            .filter((draft) => draft.ready_to_save)
            .map((draft) =>
                buildPayloadFromValues({
                    directionValue: draft.direction,
                    amountValue: String(draft.amount),
                    descriptionValue: draft.description,
                    dateValue: draft.date,
                    accountIdValue: draft.account_id,
                    categoryIdValue: draft.category_gl_id || "",
                    notesValue: draft.notes || "",
                    currencyHint: draft.currency,
                })
            );

        if (payloads.length === 0) {
            throw new Error("No hay movimientos listos para guardar. Revisa los datos detectados.");
        }

        const result = await createTransactionsBatch(payloads);
        if (result.error) {
            throw new Error(result.error);
        }

        let leveledUp = false;
        try {
            const isConstructive = payloads.some(p => p.amount >= 0 || !!p.savings_goal_id);
            const amountSaved = payloads.reduce((acc, p) => acc + Math.abs(p.amount), 0);

            Promise.all([
                updateChallengeProgress(amountSaved, isConstructive),
                interactWithPet(isConstructive ? 'save_money' : 'feed')
            ]).catch(e => console.error("Error updating challenges/pet:", e));

            const gamificationResult = await processGamificationAction("transaction");
            if (gamificationResult?.leveledUp) {
                leveledUp = true;
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("showLevelUpPopup", { detail: { level: gamificationResult.current_level } }));
                }
            } else {
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("showCashflowPopup", { detail: { type: "streak" } }));
                }
            }
        } catch (e) {
            console.error("Gamification error", e);
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("showCashflowPopup", { detail: { type: "streak" } }));
            }
        }

        setTimeout(() => {
            router.push("/dashboard/transactions");
            router.refresh();
        }, leveledUp ? 4000 : 1800);
    }

    function applyExtractedDraftToForm(draft: ExtractedTransactionDraft) {
        setDirection(draft.direction);
        setAmount(String(draft.amount));
        setDescription(draft.description);
        setDate(draft.date);
        if (draft.account_id) setAccountId(draft.account_id);
        if (draft.category_gl_id) setCategoryId(draft.category_gl_id);
        if (draft.notes) setNotes(draft.notes);
    }

    async function handleSaveDetectedBatch() {
        setScanError(null);
        setError(null);
        setBatchPending(true);

        try {
            await persistExtractedBatch(extractedItems);
        } catch (batchIssue) {
            setScanError(
                batchIssue instanceof Error
                    ? batchIssue.message
                    : "No se pudieron guardar los movimientos detectados."
            );
        } finally {
            setBatchPending(false);
        }
    }

    async function handleAnalyzeDocument() {
        if (!documentFile) {
            setScanError("Selecciona una imagen o PDF antes de analizar.");
            return;
        }

        setScanError(null);
        setScanNotice(null);
        setError(null);
        setExtractedItems([]);
        setScanPending(true);

        try {
            const formData = new FormData();
            formData.append("file", documentFile);
            formData.append("selected_account_id", accountId);
            formData.append("selected_direction", direction);
            formData.append("extraction_mode", multiMovementMode ? "multi" : "single");

            const response = await fetch("/api/transactions/extract-document", {
                method: "POST",
                body: formData,
            });

            const payload = (await response.json()) as ExtractDocumentResponse;

            if (!response.ok || !payload.success || !payload.extracted) {
                throw new Error(payload.error || "No se pudo analizar el documento.");
            }

            const extractedItemsFromApi =
                payload.extracted_items && payload.extracted_items.length > 0
                    ? payload.extracted_items
                    : payload.extracted
                        ? [payload.extracted]
                        : [];

            if (extractedItemsFromApi.length === 0) {
                throw new Error("No se detectaron movimientos claros en el documento.");
            }

            const extracted = extractedItemsFromApi[0];
            applyExtractedDraftToForm(extracted);
            setExtractedDraft(extracted);
            setExtractedItems(extractedItemsFromApi);

            const readyItems = extractedItemsFromApi.filter((item) => item.ready_to_save);

            if (mode === "create" && autoCreateFromDocument && readyItems.length > 0) {
                if (readyItems.length === 1) {
                    const autoPayload = buildPayloadFromValues({
                        directionValue: readyItems[0].direction,
                        amountValue: String(readyItems[0].amount),
                        descriptionValue: readyItems[0].description,
                        dateValue: readyItems[0].date,
                        accountIdValue: readyItems[0].account_id,
                        categoryIdValue: readyItems[0].category_gl_id || "",
                        notesValue: readyItems[0].notes || "",
                        currencyHint: readyItems[0].currency,
                    });

                    await persistTransaction(autoPayload);
                    return;
                }

                await persistExtractedBatch(readyItems);
                return;
            }

            const warningText =
                payload.warnings && payload.warnings.length > 0
                    ? ` Avisos: ${payload.warnings.join(" ")}`
                    : "";

            if (extractedItemsFromApi.length > 1) {
                const readyCount = payload.ready_to_save_count ?? readyItems.length;
                setScanNotice(
                    `Documento analizado: ${extractedItemsFromApi.length} movimientos detectados, ${readyCount} listos para guardar.${warningText}`
                );
            } else {
                setScanNotice(`Documento analizado y formulario autocompletado.${warningText}`);
            }
        } catch (scanIssue) {
            setScanError(
                scanIssue instanceof Error
                    ? scanIssue.message
                    : "No se pudo analizar el documento automáticamente."
            );
        } finally {
            setScanPending(false);
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        setIsPending(true);

        try {
            const payload = buildPayloadFromValues({
                directionValue: direction,
                amountValue: amount,
                descriptionValue: description,
                dateValue: date,
                accountIdValue: accountId,
                categoryIdValue: categoryId,
                savingsGoalIdValue: savingsGoalId,
                notesValue: notes,
                currencyHint: selectedAccountCurrency,
            });

            await persistTransaction(payload);
        } catch (submissionError) {
            setError(
                submissionError instanceof Error
                    ? submissionError.message
                    : "Ocurrió un error inesperado."
            );
        } finally {
            setIsPending(false);
        }
    }

    if (accounts.length === 0) {
        return (
            <div className="mx-auto max-w-2xl animate-fade-in">
                <div className="rounded-2xl border border-[#d9e2f0] bg-white p-6 text-center shadow-card">
                    <h1 className="text-xl font-semibold text-[#0f2233]">No hay cuentas disponibles</h1>
                    <p className="mt-2 text-sm text-surface-500">
                        Para registrar movimientos primero debes crear al menos una cuenta.
                    </p>
                    <Link href="/dashboard/settings#estructura-financiera" className="btn-primary mt-4 inline-flex text-sm no-underline hover:text-white">
                        Configurar cuentas
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-5 animate-fade-in pb-10">
            <Link
                href="/dashboard/transactions"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--tx2)] no-underline hover:text-[var(--acc)] transition-colors"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                Volver al libro de movimientos
            </Link>

            <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card mb-6">
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] items-center">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0d4c7a]">
                            NUEVO MOVIMIENTO
                        </p>
                        <h1 className="mt-2 text-2xl font-bold text-[#0f2233]">{pageTitle}</h1>
                        <p className="mt-1.5 text-sm text-surface-500">
                            Registra este movimiento para ganar experiencia y mantener tu racha activa.
                        </p>
                    </div>

                    <article className="rounded-xl border border-[#6c63ff] bg-white p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0f2233]">
                                TIP DEL CERDITO
                            </p>
                        </div>
                        <p className="text-sm text-surface-600">
                            Sé específico en tu descripción. Esto te ayudará a obtener mejores analíticas a fin de mes.
                        </p>
                    </article>
                </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error ? (
                    <div className="rounded-xl bg-[#ff4757]/10 border border-[#ff4757]/20 px-4 py-3 text-sm font-medium text-[#ff4757]">
                        {error}
                    </div>
                ) : null}

                {mode === "create" ? (
                    <section id="documento-movimiento" className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card mb-6">
                        <h2 className="text-sm font-bold text-[#0f2233] mb-1">0. Cargar comprobante (opcional)</h2>
                        <p className="mt-1 text-sm text-surface-500">
                            Sube boletas, vouchers, capturas de Yape/Plin o estados de cuenta para autocompletar el movimiento.
                        </p>

                        <div className="mt-4 space-y-3">
                            <input
                                ref={documentInputRef}
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                                onChange={(event) => {
                                    setDocumentFile(event.target.files?.[0] || null);
                                    setScanError(null);
                                    setScanNotice(null);
                                    setExtractedDraft(null);
                                    setExtractedItems([]);
                                }}
                                className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-[#e9f2ff] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#0f4c81] hover:file:bg-[#dbe9ff]"
                            />

                            <div className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-3 py-2 text-sm text-surface-600">
                                Formatos permitidos: JPG, PNG, WEBP, HEIC y PDF (máx. 10 MB).
                            </div>

                            <label className="inline-flex items-center gap-2 text-sm text-surface-700">
                                <input
                                    type="checkbox"
                                    checked={autoCreateFromDocument}
                                    onChange={(event) => setAutoCreateFromDocument(event.target.checked)}
                                    className="h-4 w-4 rounded border border-[#c8d7eb]"
                                />
                                Guardar automáticamente si la extracción está lista
                            </label>

                            <label className="inline-flex items-center gap-2 text-sm text-surface-700">
                                <input
                                    type="checkbox"
                                    checked={multiMovementMode}
                                    onChange={(event) => setMultiMovementMode(event.target.checked)}
                                    className="h-4 w-4 rounded border border-[#c8d7eb]"
                                />
                                Documento con varios movimientos (estado de cuenta)
                            </label>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={scanPending || isPending || batchPending || !documentFile}
                                    onClick={handleAnalyzeDocument}
                                    className="btn-secondary"
                                >
                                    {scanPending ? "Analizando comprobante..." : "Analizar y autocompletar"}
                                </button>
                                <button
                                    type="button"
                                    disabled={scanPending || isPending || batchPending}
                                    onClick={() => {
                                        setDocumentFile(null);
                                        setScanError(null);
                                        setScanNotice(null);
                                        setExtractedDraft(null);
                                        setExtractedItems([]);
                                        if (documentInputRef.current) {
                                            documentInputRef.current.value = "";
                                        }
                                    }}
                                    className="btn-ghost"
                                >
                                    Limpiar archivo
                                </button>
                                {extractedItems.length > 1 ? (
                                    <button
                                        type="button"
                                        disabled={scanPending || isPending || batchPending || readyExtractedItems.length === 0}
                                        onClick={handleSaveDetectedBatch}
                                        className="btn-primary"
                                    >
                                        {batchPending
                                            ? "Guardando movimientos..."
                                            : `Cargar ${readyExtractedItems.length} movimientos`}
                                    </button>
                                ) : null}
                            </div>

                            {scanError ? (
                                <div className="rounded-xl border border-[#f1d3cf] bg-[#fff5f4] px-4 py-3 text-sm text-negative-600">
                                    {scanError}
                                </div>
                            ) : null}

                            {scanNotice ? (
                                <div className="rounded-xl border border-[#d4ead8] bg-[#f3fbf5] px-4 py-3 text-sm text-positive-700">
                                    {scanNotice}
                                </div>
                            ) : null}

                            {extractedDraft ? (
                                <div className="rounded-xl border border-[#d9e2f0] bg-[#f8fbff] px-4 py-3 text-sm text-surface-700">
                                    Detectado: <strong>{extractedDraft.description}</strong> · {extractedDraft.direction === "income" ? "Ingreso" : "Egreso"} · {extractedDraft.currency} {extractedDraft.amount.toFixed(2)} · Confianza {Math.round(extractedDraft.confidence * 100)}%
                                </div>
                            ) : null}

                            {extractedItems.length > 1 ? (
                                <div className="rounded-xl border border-[#d9e2f0] bg-white px-4 py-3">
                                    <p className="text-sm font-semibold text-[#0f2233]">
                                        Movimientos detectados ({extractedItems.length})
                                    </p>
                                    <p className="mt-1 text-xs text-surface-500">
                                        Revisa los detectados. Puedes ajustar el primero en el formulario o cargar todos los listos.
                                    </p>

                                    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[#e8eef7]">
                                        <table className="w-full min-w-[760px] text-xs">
                                            <thead className="bg-[#f5f9ff] text-left text-surface-500">
                                                <tr>
                                                    <th className="px-3 py-2">Fecha</th>
                                                    <th className="px-3 py-2">Descripción</th>
                                                    <th className="px-3 py-2">Tipo</th>
                                                    <th className="px-3 py-2 text-right">Monto</th>
                                                    <th className="px-3 py-2">Cuenta</th>
                                                    <th className="px-3 py-2">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#edf2f9] bg-white">
                                                {extractedItems.map((item, index) => (
                                                    <tr key={`${item.date}-${item.description}-${index}`}>
                                                        <td className="px-3 py-2 text-surface-600">{item.date}</td>
                                                        <td className="px-3 py-2 text-[#0f2233]">{item.description}</td>
                                                        <td className="px-3 py-2 text-surface-600">
                                                            {item.direction === "income" ? "Ingreso" : "Egreso"}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold text-[#0f2233]">
                                                            {item.currency} {item.amount.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-surface-600">
                                                            {item.account_name || "Sin cuenta"}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span
                                                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${item.ready_to_save
                                                                    ? "border-[#bfdfca] bg-[#eef9f1] text-positive-700"
                                                                    : "border-[#f1d3cf] bg-[#fff5f4] text-negative-600"
                                                                    }`}
                                                            >
                                                                {item.ready_to_save ? "Listo" : "Revisar"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </section>
                ) : null}

                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card mb-6">
                    <h2 className="text-sm font-bold text-[#0f2233] border-b border-[#e8eef7] pb-3 mb-4">1. Tipo y monto</h2>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs font-bold text-surface-600">Tipo de movimiento</label>
                            <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-1">
                                <button
                                    type="button"
                                    onClick={() => setDirection("expense")}
                                    className={`rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 ${direction === "expense"
                                        ? "bg-[#ff4757] text-white shadow-sm"
                                        : "text-surface-600 hover:text-[#0f2233]"
                                        }`}
                                >
                                    Egreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDirection("income")}
                                    className={`rounded-lg px-3 py-2 text-sm font-bold transition-all duration-200 ${direction === "income"
                                        ? "bg-white border border-[#d9e2f0] text-[#0f2233] shadow-sm tracking-wide"
                                        : "text-surface-600 hover:text-[#0f2233]"
                                        }`}
                                >
                                    Ingreso
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-bold text-surface-600">Monto exacto</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold tracking-wide text-surface-400">
                                    {selectedAccountCurrency}
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    className="w-full rounded-xl border border-surface-200 bg-white pl-14 pr-4 py-3 text-lg font-bold text-[#0f2233] outline-none transition-all focus:border-[#0d4c7a] focus:ring-4 focus:ring-[#0d4c7a]/10"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card mb-6">
                    <h2 className="text-sm font-bold text-[#0f2233] border-b border-[#e8eef7] pb-3 mb-4">2. Datos del movimiento</h2>

                    <div className="space-y-5">
                        <div>
                            <label className="mb-2 block text-xs font-bold text-surface-600">Descripción</label>
                            <input
                                type="text"
                                required
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-medium text-[#0f2233] outline-none transition-all focus:border-[#0d4c7a] focus:ring-4 focus:ring-[#0d4c7a]/10"
                                placeholder="Ej. Compra de supermercado o cobro de servicio"
                            />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-surface-600">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(event) => setDate(event.target.value)}
                                    className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-medium text-[#0f2233] outline-none transition-all focus:border-[#0d4c7a] focus:ring-4 focus:ring-[#0d4c7a]/10"
                                />
                            </div>

                            <Select
                                label="Cuenta involucrada"
                                value={accountId}
                                onChange={(event) => setAccountId(event.target.value)}
                                required
                            >
                                <option value="" disabled>Selecciona una cuenta</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} ({account.currency})
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-[#d9e2f0] bg-white p-6 shadow-card mb-6">
                    <h2 className="text-sm font-bold text-[#0f2233] border-b border-[#e8eef7] pb-3 mb-4">3. Clasificación (Opcional pero adictiva)</h2>

                    <div className="space-y-5">
                        <Select
                            label="Categoría"
                            value={categoryId}
                            onChange={(event) => setCategoryId(event.target.value)}
                        >
                            <option value="">Sin categoría asignada</option>
                            {filteredCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Select>

                        {direction === "expense" && savingsGoals && savingsGoals.length > 0 ? (
                            <Select
                                label="Impulsar meta de ahorro"
                                value={savingsGoalId}
                                onChange={(event) => setSavingsGoalId(event.target.value)}
                            >
                                <option value="">No asociar a meta</option>
                                {savingsGoals.map((goal) => (
                                    <option key={goal.id} value={goal.id}>
                                        {goal.name} (Meta: {goal.target_amount})
                                    </option>
                                ))}
                            </Select>
                        ) : null}

                        <div>
                            <label className="mb-2 block text-xs font-bold text-surface-600">Notas para tu Yo del futuro</label>
                            <textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-medium text-[#0f2233] outline-none transition-all focus:border-[#0d4c7a] focus:ring-4 focus:ring-[#0d4c7a]/10 min-h-[96px]"
                                placeholder="Escribe aquí un detalle para recordar esto después..."
                            />
                        </div>
                    </div>
                </section>

                <section className="flex flex-wrap items-center justify-end gap-3 pb-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={isPending || batchPending}
                        className="btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isPending || batchPending}
                        className="btn-primary"
                    >
                        {isPending ? "Guardando..." : submitLabel}
                    </button>
                </section>
            </form>
        </div>
    );
}

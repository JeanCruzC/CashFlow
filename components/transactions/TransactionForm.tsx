"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { createTransaction, updateTransaction } from "@/app/actions/transactions";
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
    extracted?: ExtractedTransactionDraft;
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
    const [extractedDraft, setExtractedDraft] = useState<ExtractedTransactionDraft | null>(null);

    const selectedAccountCurrency = useMemo(() => {
        const accountCurrency = accounts.find((account) => account.id === accountId)?.currency;
        return (accountCurrency || initialValues?.currency || accounts[0]?.currency || "USD").toUpperCase();
    }, [accountId, accounts, initialValues?.currency]);

    const pageTitle = mode === "edit" ? "Editar movimiento" : "Registrar movimiento";
    const submitLabel = mode === "edit" ? "Guardar cambios" : "Guardar movimiento";

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

        router.push("/dashboard/transactions");
        router.refresh();
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

    async function handleAnalyzeDocument() {
        if (!documentFile) {
            setScanError("Selecciona una imagen o PDF antes de analizar.");
            return;
        }

        setScanError(null);
        setScanNotice(null);
        setError(null);
        setScanPending(true);

        try {
            const formData = new FormData();
            formData.append("file", documentFile);
            formData.append("selected_account_id", accountId);
            formData.append("selected_direction", direction);

            const response = await fetch("/api/transactions/extract-document", {
                method: "POST",
                body: formData,
            });

            const payload = (await response.json()) as ExtractDocumentResponse;

            if (!response.ok || !payload.success || !payload.extracted) {
                throw new Error(payload.error || "No se pudo analizar el documento.");
            }

            const extracted = payload.extracted;
            applyExtractedDraftToForm(extracted);
            setExtractedDraft(extracted);

            if (mode === "create" && autoCreateFromDocument && extracted.ready_to_save) {
                const autoPayload = buildPayloadFromValues({
                    directionValue: extracted.direction,
                    amountValue: String(extracted.amount),
                    descriptionValue: extracted.description,
                    dateValue: extracted.date,
                    accountIdValue: extracted.account_id,
                    categoryIdValue: extracted.category_gl_id || "",
                    notesValue: extracted.notes || "",
                    currencyHint: extracted.currency,
                });

                await persistTransaction(autoPayload);
                return;
            }

            const warningText =
                payload.warnings && payload.warnings.length > 0
                    ? ` Avisos: ${payload.warnings.join(" ")}`
                    : "";

            setScanNotice(`Documento analizado y formulario autocompletado.${warningText}`);
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
        <div className="mx-auto max-w-4xl space-y-4 animate-fade-in">
            <Link
                href="/dashboard/transactions"
                className="inline-flex items-center gap-1 text-sm text-surface-500 no-underline hover:text-[#0f2233]"
            >
                ← Volver al libro de movimientos
            </Link>

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-400">
                            Ciclo mensual · Registrar
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold text-[#0f2233]">{pageTitle}</h1>
                        <p className="mt-2 text-sm text-surface-600">
                            Captura un movimiento real para actualizar automáticamente panorama,
                            control presupuestal y proyección.
                        </p>
                    </div>

                    <article className="rounded-xl border border-[#d9e2f0] bg-[#f7fbff] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Reglas rápidas
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-surface-600">
                            <li>1. Usa descripción específica y corta.</li>
                            <li>2. Selecciona la cuenta correcta de origen/destino.</li>
                            <li>3. Revisa categoría para mejorar tus reportes.</li>
                        </ul>
                    </article>
                </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error ? (
                    <div className="rounded-xl border border-[#f1d3cf] bg-[#fff5f4] px-4 py-3 text-sm text-negative-600">
                        {error}
                    </div>
                ) : null}

                {mode === "create" ? (
                    <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                        <h2 className="text-base font-semibold text-[#0f2233]">0. Cargar comprobante (opcional)</h2>
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

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    disabled={scanPending || isPending || !documentFile}
                                    onClick={handleAnalyzeDocument}
                                    className="btn-secondary"
                                >
                                    {scanPending ? "Analizando comprobante..." : "Analizar y autocompletar"}
                                </button>
                                <button
                                    type="button"
                                    disabled={scanPending || isPending}
                                    onClick={() => {
                                        setDocumentFile(null);
                                        setScanError(null);
                                        setScanNotice(null);
                                        setExtractedDraft(null);
                                        if (documentInputRef.current) {
                                            documentInputRef.current.value = "";
                                        }
                                    }}
                                    className="btn-ghost"
                                >
                                    Limpiar archivo
                                </button>
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
                        </div>
                    </section>
                ) : null}

                <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h2 className="text-base font-semibold text-[#0f2233]">1. Tipo y monto</h2>
                    <p className="mt-1 text-sm text-surface-500">
                        Define si es ingreso o egreso, y el importe exacto en la moneda de la cuenta.
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-surface-700">Tipo de movimiento</label>
                            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#d9e2f0] bg-[#f8fbff] p-1.5">
                                <button
                                    type="button"
                                    onClick={() => setDirection("expense")}
                                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                        direction === "expense"
                                            ? "bg-white text-negative-600 shadow-sm"
                                            : "text-surface-500 hover:text-[#0f2233]"
                                    }`}
                                >
                                    Egreso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDirection("income")}
                                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                        direction === "income"
                                            ? "bg-white text-positive-600 shadow-sm"
                                            : "text-surface-500 hover:text-[#0f2233]"
                                    }`}
                                >
                                    Ingreso
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-surface-700">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-surface-400">
                                    {selectedAccountCurrency}
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    className="input-field pl-16"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h2 className="text-base font-semibold text-[#0f2233]">2. Datos del movimiento</h2>
                    <p className="mt-1 text-sm text-surface-500">
                        Describe el hecho contable y define fecha + cuenta de impacto.
                    </p>

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-surface-700">Descripción</label>
                            <input
                                type="text"
                                required
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                className="input-field"
                                placeholder="Ej. Compra de supermercado / Cobro de servicio"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-surface-700">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(event) => setDate(event.target.value)}
                                    className="input-field"
                                />
                            </div>

                            <Select
                                label="Cuenta"
                                value={accountId}
                                onChange={(event) => setAccountId(event.target.value)}
                                required
                            >
                                <option value="" disabled>
                                    Selecciona una cuenta
                                </option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.name} ({account.currency})
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-[#d9e2f0] bg-white p-6 shadow-card">
                    <h2 className="text-base font-semibold text-[#0f2233]">3. Clasificación y contexto</h2>
                    <p className="mt-1 text-sm text-surface-500">
                        Asigna categoría, meta de ahorro y observaciones para mejorar análisis posterior.
                    </p>

                    <div className="mt-4 space-y-4">
                        <Select
                            label="Categoría"
                            value={categoryId}
                            onChange={(event) => setCategoryId(event.target.value)}
                        >
                            <option value="">Sin categoría</option>
                            {filteredCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </Select>

                        {direction === "expense" && savingsGoals && savingsGoals.length > 0 ? (
                            <Select
                                label="Asignar a meta de ahorro (opcional)"
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
                            <label className="mb-1.5 block text-sm font-medium text-surface-700">Notas (opcional)</label>
                            <textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                className="input-field min-h-[96px]"
                                placeholder="Detalle adicional para auditoría o seguimiento"
                            />
                        </div>
                    </div>
                </section>

                <section className="flex flex-wrap items-center justify-end gap-2 pb-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        disabled={isPending}
                        className="btn-secondary"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="btn-primary min-w-[180px]"
                    >
                        {isPending ? "Guardando..." : submitLabel}
                    </button>
                </section>
            </form>
        </div>
    );
}

"use client";

import { deleteTransaction } from "@/app/actions/transactions";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Transaction } from "@/lib/types/finance";

interface TransactionWithJoins extends Transaction {
    accounts: { name: string } | null;
    categories_gl: { name: string } | null;
}

interface TransactionGridProps {
    initialData: TransactionWithJoins[];
    totalCount: number;
    page: number;
    pageSize: number;
    sort: string;
    sortDir: string;
    search: string;
    accountId: string;
    categoryId: string;
    direction: "income" | "expense" | "all";
    dateFrom: string;
    dateTo: string;
    accounts: Array<{ id: string; name: string }>;
    categories: Array<{ id: string; name: string }>;
}

type SearchKey = "search" | "accountId" | "categoryId" | "direction" | "dateFrom" | "dateTo";

export function TransactionGrid({
    initialData,
    totalCount,
    page,
    pageSize,
    sort,
    sortDir,
    search,
    accountId,
    categoryId,
    direction,
    dateFrom,
    dateTo,
    accounts,
    categories,
}: TransactionGridProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [term, setTerm] = useState(search);
    const [importing, setImporting] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const data = initialData;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const hasData = data.length > 0;
    const showingFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const showingTo = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

    const exportHref = useMemo(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        return `/api/transactions/export?${params.toString()}`;
    }, [searchParams]);

    function updateParams(updates: Partial<Record<SearchKey | "sort" | "sortDir" | "page", string>>) {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (!value) {
                params.delete(key);
                return;
            }
            params.set(key, value);
        });

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    }

    function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        updateParams({
            search: term.trim(),
            page: "1",
        });
    }

    function handleSort(key: string) {
        if (sort === key) {
            updateParams({
                sortDir: sortDir === "asc" ? "desc" : "asc",
            });
            return;
        }

        updateParams({
            sort: key,
            sortDir: "desc",
            page: "1",
        });
    }

    function handlePage(nextPage: number) {
        if (nextPage < 1 || nextPage > totalPages) return;
        updateParams({ page: String(nextPage) });
    }

    function handleFilterChange(key: SearchKey, value: string) {
        updateParams({
            [key]: value,
            page: "1",
        });
    }

    function handleClearFilters() {
        setTerm("");
        const params = new URLSearchParams(searchParams.toString());
        ["search", "accountId", "categoryId", "direction", "dateFrom", "dateTo", "page"].forEach((key) => {
            params.delete(key);
        });
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    }

    async function handleDelete(id: string) {
        const confirmed = confirm("¿Seguro que deseas eliminar esta transacción?");
        if (!confirmed) return;

        setError(null);
        setNotice(null);

        const result = await deleteTransaction(id);
        if (result.error) {
            setError(result.error);
            return;
        }

        setNotice("Transacción eliminada.");
        router.refresh();
    }

    function handleImportClick() {
        fileInputRef.current?.click();
    }

    async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setNotice(null);
        setImporting(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/transactions/import", {
                method: "POST",
                body: formData,
            });

            const payload = (await response.json()) as {
                error?: string;
                inserted?: number;
                errors?: string[];
            };

            if (!response.ok) {
                setError(payload.error || "No se pudo importar el archivo.");
                return;
            }

            const inserted = payload.inserted ?? 0;
            const rowErrors = payload.errors || [];
            const summary =
                rowErrors.length > 0
                    ? `Importación finalizada: ${inserted} filas insertadas, ${rowErrors.length} con error.`
                    : `Importación finalizada: ${inserted} filas insertadas.`;

            setNotice(summary);
            router.refresh();
        } catch {
            setError("No se pudo importar el archivo.");
        } finally {
            setImporting(false);
            event.target.value = "";
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">Libro financiero</p>
                        <h1 className="mt-2 text-3xl font-semibold text-[#0f2233]">Transacciones</h1>
                        <p className="mt-2 text-sm text-surface-500">
                            Registro operativo de movimientos con filtros por cuenta, categoría y periodo.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleImportChange}
                        />
                        <button
                            onClick={handleImportClick}
                            className="btn-ghost text-sm"
                            disabled={importing}
                            type="button"
                        >
                            {importing ? "Importando..." : "Importar CSV"}
                        </button>
                        <a href={exportHref} className="btn-ghost text-sm">
                            Exportar CSV
                        </a>
                        <Link
                            href="/dashboard/transactions/new"
                            className="btn-primary text-sm no-underline hover:text-white"
                        >
                            Nueva transacción
                        </Link>
                    </div>
                </div>
            </section>

            {error && (
                <div className="mb-4 rounded-lg border border-negative-200 bg-negative-50 px-4 py-3 text-sm text-negative-700">
                    {error}
                </div>
            )}
            {notice && (
                <div className="mb-4 rounded-lg border border-positive-200 bg-positive-50 px-4 py-3 text-sm text-positive-700">
                    {notice}
                </div>
            )}

            <section className="space-y-3 rounded-3xl border border-surface-200 bg-white p-4 shadow-card">
                <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSearchSubmit}>
                    <input
                        type="text"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="Buscar por descripción..."
                        className="input-field text-sm"
                    />
                    <button type="submit" className="btn-secondary text-sm">
                        Buscar
                    </button>
                    <button type="button" className="btn-ghost text-sm" onClick={handleClearFilters}>
                        Limpiar filtros
                    </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <select
                        className="input-field text-sm"
                        value={accountId}
                        onChange={(event) => handleFilterChange("accountId", event.target.value)}
                    >
                        <option value="">Todas las cuentas</option>
                        {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                                {account.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="input-field text-sm"
                        value={categoryId}
                        onChange={(event) => handleFilterChange("categoryId", event.target.value)}
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="input-field text-sm"
                        value={direction}
                        onChange={(event) => handleFilterChange("direction", event.target.value)}
                    >
                        <option value="all">Todos los movimientos</option>
                        <option value="income">Solo ingresos</option>
                        <option value="expense">Solo egresos</option>
                    </select>

                    <input
                        type="date"
                        className="input-field text-sm"
                        value={dateFrom}
                        onChange={(event) => handleFilterChange("dateFrom", event.target.value)}
                    />

                    <input
                        type="date"
                        className="input-field text-sm"
                        value={dateTo}
                        onChange={(event) => handleFilterChange("dateTo", event.target.value)}
                    />
                </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-card">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-surface-50 dark:bg-surface-900/50">
                                {[
                                    { key: "date", label: "Fecha", sortable: true },
                                    { key: "description", label: "Descripción", sortable: true },
                                    { key: "account", label: "Cuenta", sortable: false },
                                    { key: "category", label: "Categoría", sortable: false },
                                    { key: "amount", label: "Monto", sortable: true, align: "right" },
                                ].map((column) => {
                                    const isSorted = sort === column.key;

                                    return (
                                        <th
                                            key={column.key}
                                            className={`table-header py-3 px-4 ${column.align === "right" ? "text-right" : "text-left"} ${column.sortable ? "cursor-pointer hover:text-surface-700 dark:hover:text-surface-200" : ""}`}
                                            onClick={column.sortable ? () => handleSort(column.key) : undefined}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                {column.label}
                                                {isSorted && (
                                                    <span className="text-brand-500 text-[10px]">
                                                        {sortDir === "asc" ? "↑" : "↓"}
                                                    </span>
                                                )}
                                            </span>
                                        </th>
                                    );
                                })}
                                <th className="table-header py-3 px-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {!hasData ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-muted">
                                        No hay transacciones para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                        <td className="py-3 px-4 whitespace-nowrap text-muted">
                                            {new Date(row.date).toLocaleDateString("es-PE")}
                                        </td>
                                        <td className="py-3 px-4 font-medium">{row.description}</td>
                                        <td className="py-3 px-4 text-muted">{row.accounts?.name || "-"}</td>
                                        <td className="py-3 px-4 text-muted">{row.categories_gl?.name || "Sin categoría"}</td>
                                        <td className={`py-3 px-4 text-right font-medium ${row.amount >= 0 ? "amount-positive" : "amount-negative"}`}>
                                            {row.amount >= 0 ? "+" : "-"}$
                                            {Math.abs(row.amount).toLocaleString("es-PE", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-3 text-sm">
                                                <Link
                                                    href={`/dashboard/transactions/${row.id}/edit`}
                                                    className="text-brand-600 hover:text-brand-700"
                                                >
                                                    Editar
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(row.id)}
                                                    className="text-negative-600 hover:text-negative-700"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-xs text-muted">
                        Mostrando {showingFrom}-{showingTo} de {totalCount} transacciones
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                        <button
                            type="button"
                            className="btn-ghost px-2 py-1"
                            disabled={page <= 1}
                            onClick={() => handlePage(page - 1)}
                        >
                            Anterior
                        </button>
                        <span>
                            Página {page} de {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn-ghost px-2 py-1"
                            disabled={page >= totalPages}
                            onClick={() => handlePage(page + 1)}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

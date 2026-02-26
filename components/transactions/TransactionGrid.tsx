"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { deleteTransaction } from "@/app/actions/transactions";
import { ModuleHero } from "@/components/ui/ModuleHero";
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

function formatRowAmount(amount: number, currency?: string) {
    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: (currency || "USD").toUpperCase(),
    }).format(Math.abs(amount));
}

function sortIndicator(column: string, activeSort: string, activeDirection: string) {
    if (column !== activeSort) return "";
    return activeDirection === "asc" ? "↑" : "↓";
}

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

    const activeFilterCount = [
        search,
        accountId,
        categoryId,
        direction !== "all" ? direction : "",
        dateFrom,
        dateTo,
    ].filter(Boolean).length;

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
            updateParams({ sortDir: sortDir === "asc" ? "desc" : "asc" });
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

        setNotice("Transacción eliminada correctamente.");
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
                    ? `Importación completada: ${inserted} filas insertadas y ${rowErrors.length} con error.`
                    : `Importación completada: ${inserted} filas insertadas.`;

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
            <ModuleHero
                eyebrow="Flujo diario · Registro por fecha"
                title="Diario financiero"
                description="Cada ingreso, gasto y pago se registra por fecha para que el control sea claro y facil de seguir."
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Acciones
                        </p>
                        <p className="mt-1 text-sm text-surface-600">
                            Importa, exporta o registra manualmente.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={handleImportChange}
                            />
                            <button
                                onClick={handleImportClick}
                                className="btn-secondary text-sm"
                                disabled={importing}
                                type="button"
                            >
                                {importing ? "Importando..." : "Importar CSV"}
                            </button>
                            <a href={exportHref} className="btn-secondary text-sm no-underline">
                                Exportar CSV
                            </a>
                            <Link
                                href="/dashboard/transactions/new"
                                className="btn-primary text-sm no-underline hover:text-white"
                            >
                                Nuevo movimiento
                            </Link>
                        </div>
                    </>
                }
            >
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <article className="rounded-xl border border-[#d9e2f0] bg-white/75 px-3 py-2">
                        <p className="text-xs text-surface-500">Movimientos</p>
                        <p className="mt-1 text-lg font-semibold text-[#0f2233]">{totalCount}</p>
                    </article>
                    <article className="rounded-xl border border-[#d9e2f0] bg-white/75 px-3 py-2">
                        <p className="text-xs text-surface-500">Filtros activos</p>
                        <p className="mt-1 text-lg font-semibold text-[#0f2233]">{activeFilterCount}</p>
                    </article>
                    <article className="rounded-xl border border-[#d9e2f0] bg-white/75 px-3 py-2">
                        <p className="text-xs text-surface-500">Rango visible</p>
                        <p className="mt-1 text-lg font-semibold text-[#0f2233]">
                            {showingFrom}-{showingTo}
                        </p>
                    </article>
                </div>
            </ModuleHero>

            {error ? (
                <div className="rounded-xl border border-[#f1d3cf] bg-[#fff5f4] px-4 py-3 text-sm text-negative-600">
                    {error}
                </div>
            ) : null}
            {notice ? (
                <div className="rounded-xl border border-[#c6e5dd] bg-[#eef9f5] px-4 py-3 text-sm text-positive-600">
                    {notice}
                </div>
            ) : null}

            <section className="rounded-2xl border border-[#d9e2f0] bg-white p-4 shadow-card">
                <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
                    Filtros por fecha y tipo
                </p>

                <form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={handleSearchSubmit}>
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
                    <button type="button" className="btn-secondary text-sm" onClick={handleClearFilters}>
                        Limpiar
                    </button>
                </form>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                        <option value="all">Todos</option>
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

            <section className="overflow-hidden rounded-2xl border border-[#d9e2f0] bg-white shadow-card">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead className="bg-[#f5f9ff]">
                            <tr className="text-left text-surface-500">
                                {[
                                    { key: "date", label: "Fecha", sortable: true },
                                    { key: "description", label: "Descripción", sortable: true },
                                    { key: "account", label: "Cuenta", sortable: false },
                                    { key: "category", label: "Categoría", sortable: false },
                                    { key: "amount", label: "Monto", sortable: true, align: "right" },
                                ].map((column) => (
                                    <th
                                        key={column.key}
                                        className={`px-4 py-3 font-semibold ${column.align === "right" ? "text-right" : "text-left"} ${
                                            column.sortable ? "cursor-pointer select-none" : ""
                                        }`}
                                        onClick={column.sortable ? () => handleSort(column.key) : undefined}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {column.label}
                                            <span className="text-[11px] text-[#0d4c7a]">
                                                {sortIndicator(column.key, sort, sortDir)}
                                            </span>
                                        </span>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#e9eef6] bg-white">
                            {!hasData ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-surface-500">
                                        <p>No hay transacciones para los filtros seleccionados.</p>
                                        <Link
                                            href="/dashboard/transactions/new"
                                            className="mt-3 inline-flex text-sm font-semibold text-[#0d4c7a] no-underline hover:text-[#117068]"
                                        >
                                            Registrar primer movimiento
                                        </Link>
                                    </td>
                                </tr>
                            ) : (
                                data.map((row) => (
                                    <tr key={row.id} className="hover:bg-[#f9fcff] transition-colors">
                                        <td className="px-4 py-3 text-surface-500">
                                            {new Date(row.date).toLocaleDateString("es-PE")}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-[#0f2233]">{row.description}</td>
                                        <td className="px-4 py-3 text-surface-500">{row.accounts?.name || "-"}</td>
                                        <td className="px-4 py-3 text-surface-500">{row.categories_gl?.name || "Sin categoría"}</td>
                                        <td
                                            className={`px-4 py-3 text-right font-semibold ${
                                                row.amount >= 0 ? "text-positive-600" : "text-negative-600"
                                            }`}
                                        >
                                            {row.amount >= 0 ? "+" : "-"}
                                            {formatRowAmount(row.amount, row.currency)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-3 text-sm">
                                                <Link
                                                    href={`/dashboard/transactions/${row.id}/edit`}
                                                    className="font-medium text-[#0d4c7a] no-underline hover:text-[#117068]"
                                                >
                                                    Editar
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(row.id)}
                                                    className="font-medium text-negative-600 hover:text-negative-700"
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

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9eef6] px-4 py-3">
                    <p className="text-xs text-surface-500">
                        Mostrando {showingFrom}-{showingTo} de {totalCount} movimientos
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                        <button
                            type="button"
                            className="btn-secondary px-3 py-1.5 text-sm"
                            disabled={page <= 1}
                            onClick={() => handlePage(page - 1)}
                        >
                            Anterior
                        </button>
                        <span className="text-surface-600">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            type="button"
                            className="btn-secondary px-3 py-1.5 text-sm"
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

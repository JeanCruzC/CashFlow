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
    return activeDirection === "asc" ? " ↑" : " ↓";
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
            if (!value) { params.delete(key); return; }
            params.set(key, value);
        });
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    }

    function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        updateParams({ search: term.trim(), page: "1" });
    }

    function handleSort(key: string) {
        if (sort === key) { updateParams({ sortDir: sortDir === "asc" ? "desc" : "asc" }); return; }
        updateParams({ sort: key, sortDir: "desc", page: "1" });
    }

    function handlePage(nextPage: number) {
        if (nextPage < 1 || nextPage > totalPages) return;
        updateParams({ page: String(nextPage) });
    }

    function handleFilterChange(key: SearchKey, value: string) {
        updateParams({ [key]: value, page: "1" });
    }

    function handleClearFilters() {
        setTerm("");
        const params = new URLSearchParams(searchParams.toString());
        ["search", "accountId", "categoryId", "direction", "dateFrom", "dateTo", "page"].forEach((key) => { params.delete(key); });
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    }

    async function handleDelete(id: string) {
        const confirmed = confirm("¿Seguro que deseas eliminar esta transacción?");
        if (!confirmed) return;
        setError(null); setNotice(null);
        const result = await deleteTransaction(id);
        if (result.error) { setError(result.error); return; }
        setNotice("Transacción eliminada correctamente.");
        router.refresh();
    }

    function handleImportClick() { fileInputRef.current?.click(); }

    async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setError(null); setNotice(null); setImporting(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch("/api/transactions/import", { method: "POST", body: formData });
            const payload = (await response.json()) as { error?: string; inserted?: number; errors?: string[] };
            if (!response.ok) { setError(payload.error || "No se pudo importar el archivo."); return; }
            const inserted = payload.inserted ?? 0;
            const rowErrors = payload.errors || [];
            const summary = rowErrors.length > 0
                ? `Importación completada: ${inserted} filas insertadas y ${rowErrors.length} con error.`
                : `Importación completada: ${inserted} filas insertadas.`;
            setNotice(summary);
            router.refresh();
        } catch { setError("No se pudo importar el archivo."); }
        finally { setImporting(false); event.target.value = ""; }
    }

    // Generate page numbers for pagination
    const pageNumbers: number[] = [];
    const maxPages = 5;
    let startPage = Math.max(1, page - Math.floor(maxPages / 2));
    const endPage = Math.min(totalPages, startPage + maxPages - 1);
    if (endPage - startPage + 1 < maxPages) startPage = Math.max(1, endPage - maxPages + 1);
    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

    return (
        <div className="min-h-screen">
            <ModuleHero
                eyebrow="FLUJO DIARIO · REGISTRO POR FECHA"
                title="Diario financiero"
                description="Cada ingreso, gasto y pago se registra por fecha"
                actions={
                    <>
                        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportChange} />
                        <button onClick={handleImportClick} className="h-btn1" disabled={importing} type="button">{importing ? "Importando..." : "Importar CSV"}</button>
                        <a href={exportHref} className="h-btn2 no-underline">Exportar CSV</a>
                        <Link href="/dashboard/transactions/new" className="h-btn1 no-underline">Nuevo movimiento</Link>
                    </>
                }
                rightPanel={
                    <>
                        <div className="h-stat"><div className="h-stat-lbl">Movimientos</div><div className="h-stat-n" style={{ color: "#5effd5" }}>{totalCount}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl">Filtros activos</div><div className="h-stat-n" style={{ color: "#fff" }}>{activeFilterCount}</div></div>
                        <div className="h-stat"><div className="h-stat-lbl">Rango visible</div><div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{showingFrom}–{showingTo}</div></div>
                    </>
                }
            />

            {/* Notices */}
            {error && <div style={{ background: "var(--ng-l)", border: "1px solid rgba(245,54,92,.2)", borderRadius: "var(--r2)", padding: "12px 16px", fontSize: "13px", color: "var(--ng)", marginBottom: "14px" }}>{error}</div>}
            {notice && <div style={{ background: "var(--ok-l)", border: "1px solid rgba(0,184,122,.2)", borderRadius: "var(--r2)", padding: "12px 16px", fontSize: "13px", color: "var(--ok)", marginBottom: "14px" }}>{notice}</div>}

            {/* Filter Bar */}
            <div className="filter-bar fu in" style={{ transitionDelay: ".06s" }}>
                <form onSubmit={handleSearchSubmit} style={{ display: "contents" }}>
                    <input type="text" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Buscar por descripción..." className="filter-input" />
                    <button type="submit" className="filter-btn">Buscar</button>
                </form>
                <select className="filter-select" value={accountId} onChange={(event) => handleFilterChange("accountId", event.target.value)}>
                    <option value="">Todas las cuentas</option>
                    {accounts.map((account) => (<option key={account.id} value={account.id}>{account.name}</option>))}
                </select>
                <select className="filter-select" value={categoryId} onChange={(event) => handleFilterChange("categoryId", event.target.value)}>
                    <option value="">Todas las categorías</option>
                    {categories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}
                </select>
                <select className="filter-select" value={direction} onChange={(event) => handleFilterChange("direction", event.target.value)}>
                    <option value="all">Todos</option>
                    <option value="income">Solo ingresos</option>
                    <option value="expense">Solo egresos</option>
                </select>
                <input type="date" className="filter-input" style={{ minWidth: "130px", flex: "none" }} value={dateFrom} onChange={(event) => handleFilterChange("dateFrom", event.target.value)} />
                <input type="date" className="filter-input" style={{ minWidth: "130px", flex: "none" }} value={dateTo} onChange={(event) => handleFilterChange("dateTo", event.target.value)} />
                {activeFilterCount > 0 && (
                    <button type="button" className="filter-btn sec" onClick={handleClearFilters}>Limpiar</button>
                )}
            </div>

            {/* Table */}
            <div className="table-wrap fu in" style={{ transitionDelay: ".1s" }}>
                <table className="table-v">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort("date")} style={{ cursor: "pointer" }}>FECHA{sortIndicator("date", sort, sortDir)}</th>
                            <th onClick={() => handleSort("description")} style={{ cursor: "pointer" }}>DESCRIPCIÓN{sortIndicator("description", sort, sortDir)}</th>
                            <th>CUENTA</th>
                            <th>CATEGORÍA</th>
                            <th onClick={() => handleSort("amount")} style={{ cursor: "pointer", textAlign: "right" }}>MONTO{sortIndicator("amount", sort, sortDir)}</th>
                            <th style={{ textAlign: "right" }}>ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!hasData ? (
                            <tr>
                                <td colSpan={6}>
                                    <div className="table-empty">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                        No hay transacciones para los filtros seleccionados.<br />
                                        <Link href="/dashboard/transactions/new" style={{ color: "var(--acc)", fontWeight: 600, textDecoration: "none" }}>Registrar primer movimiento →</Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((row) => (
                                <tr key={row.id}>
                                    <td style={{ fontWeight: 600, color: "var(--tx2)" }}>{new Date(row.date).toLocaleDateString("es-PE")}</td>
                                    <td style={{ fontWeight: 700 }}>{row.description}</td>
                                    <td style={{ color: "var(--tx2)" }}>{row.accounts?.name || "—"}</td>
                                    <td><span className="ptag if">{row.categories_gl?.name || "Sin categoría"}</span></td>
                                    <td style={{ textAlign: "right" }}>
                                        <span className={row.amount >= 0 ? "pos" : "neg"} style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: "14px", fontWeight: 700 }}>
                                            {row.amount >= 0 ? "+" : "−"}{formatRowAmount(row.amount, row.currency)}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                            <Link href={`/dashboard/transactions/${row.id}/edit`} style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--acc)", textDecoration: "none", transition: "opacity .14s" }}>Editar</Link>
                                            <button type="button" onClick={() => handleDelete(row.id)} style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--tx2)", background: "none", border: "none", cursor: "pointer", transition: "color .14s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--ng)"} onMouseOut={(e) => e.currentTarget.style.color = "var(--tx2)"}>Eliminar</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {hasData && (
                    <div className="table-foot">
                        <span>Mostrando {showingFrom}–{showingTo} de {totalCount}</span>
                        <div className="pag">
                            <button type="button" className="pag-btn" disabled={page <= 1} onClick={() => handlePage(page - 1)}>‹</button>
                            {pageNumbers.map((p) => (
                                <button key={p} type="button" className={`pag-btn ${p === page ? "active" : ""}`} onClick={() => handlePage(p)}>{p}</button>
                            ))}
                            <button type="button" className="pag-btn" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>›</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

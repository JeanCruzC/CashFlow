"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    Plus, Search, Filter, Download, Upload,
    ChevronLeft, ChevronRight, ArrowUpDown,
    Pencil, Trash2,
} from "lucide-react";
import { deleteTransaction } from "@/app/actions/transactions";
import { Transaction } from "@/lib/types/finance";

// Extend Transaction type to include joined fields
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
}

export function TransactionGrid({
    initialData,
    totalCount,
    page,
    pageSize,
    sort,
    sortDir,
    search
}: TransactionGridProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const data = initialData;
    const [term, setTerm] = useState(search);

    function handleSearch(term: string) {
        setTerm(term);
        const params = new URLSearchParams(searchParams);
        if (term) params.set("search", term);
        else params.delete("search");
        params.set("page", "1");
        router.replace(`${pathname}?${params.toString()}`);
    }

    function handleSort(key: string) {
        const params = new URLSearchParams(searchParams);
        if (sort === key) {
            params.set("sortDir", sortDir === "asc" ? "desc" : "asc");
        } else {
            params.set("sort", key);
            params.set("sortDir", "desc");
        }
        router.replace(`${pathname}?${params.toString()}`);
    }

    function handlePage(newPage: number) {
        const params = new URLSearchParams(searchParams);
        params.set("page", newPage.toString());
        router.replace(`${pathname}?${params.toString()}`);
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        await deleteTransaction(id);
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Transactions</h1>
                    <p className="text-muted mt-1">Manage your transaction ledger</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="btn-ghost flex items-center gap-2 text-sm opacity-60 cursor-not-allowed"
                        disabled
                        title="Import coming soon"
                    >
                        <Upload size={14} />Import
                    </button>
                    <button
                        className="btn-ghost flex items-center gap-2 text-sm opacity-60 cursor-not-allowed"
                        disabled
                        title="Export coming soon"
                    >
                        <Download size={14} />Export
                    </button>
                    <Link href="/dashboard/transactions/new" className="btn-primary flex items-center gap-2 text-sm no-underline hover:text-white">
                        <Plus size={14} />Add Transaction
                    </Link>
                </div>
            </div>

            <div className="card p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            value={term}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search transactions..."
                            className="input-field pl-9 text-sm"
                        />
                    </div>
                    <button
                        className="btn-secondary flex items-center gap-2 text-sm opacity-60 cursor-not-allowed"
                        disabled
                        title="Filters coming soon"
                    >
                        <Filter size={14} />Filters
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-surface-50 dark:bg-surface-900/50">
                                {[
                                    { key: "date", label: "Date", sortable: true },
                                    { key: "description", label: "Description", sortable: true },
                                    { key: "accounts.name", label: "Account", sortable: false },
                                    { key: "categories_gl.name", label: "Category", sortable: false },
                                    { key: "amount", label: "Amount", align: "right", sortable: true },
                                ].map(({ key, label, align, sortable }) => (
                                    <th
                                        key={key}
                                        className={`table-header py-3 px-4 transition-colors select-none ${align === "right" ? "text-right" : "text-left"} ${sortable ? "cursor-pointer hover:text-surface-700 dark:hover:text-surface-200" : "text-surface-400"}`}
                                        onClick={sortable ? () => handleSort(key) : undefined}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {label}
                                            {sortable && sort === key && <ArrowUpDown size={12} className="text-brand-500" />}
                                        </span>
                                    </th>
                                ))}
                                <th className="table-header py-3 px-4 text-center w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-muted">No transactions found.</td>
                                </tr>
                            ) : data.map((row) => (
                                <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                    <td className="py-3 px-4 whitespace-nowrap text-muted">{new Date(row.date).toLocaleDateString()}</td>
                                    <td className="py-3 px-4 font-medium">{row.description}</td>
                                    <td className="py-3 px-4 text-muted">{row.accounts?.name || '-'}</td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                                            {row.categories_gl?.name || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td className={`py-3 px-4 text-right font-medium ${row.amount >= 0 ? "amount-positive" : "amount-negative"}`}>
                                        {row.amount >= 0 ? "+" : ""}${Math.abs(row.amount).toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                className="p-1.5 rounded-md text-surface-300 cursor-not-allowed"
                                                aria-label="Edit"
                                                disabled
                                                title="Edit coming soon"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded-md hover:bg-negative-500/10 text-surface-400 hover:text-negative-500 cursor-pointer" aria-label="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-xs text-muted">
                        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} transactions
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => handlePage(page - 1)} disabled={page === 1} className="btn-ghost p-1.5 disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={14} /></button>
                        <span className="text-xs font-medium px-2">{page} / {totalPages || 1}</span>
                        <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages} className="btn-ghost p-1.5 disabled:opacity-30" aria-label="Next page"><ChevronRight size={14} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

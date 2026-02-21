"use client";

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard route error", error);
    }, [error]);

    return (
        <div className="mx-auto max-w-2xl rounded-3xl border border-surface-200 bg-white p-8 text-center shadow-card">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">Error de carga</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#0f2233]">
                No pudimos cargar esta sección del dashboard
            </h2>
            <p className="mt-2 text-sm text-surface-500">
                Verifica la conexión con Supabase y vuelve a intentarlo.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
                <button type="button" onClick={reset} className="btn-primary text-sm">
                    Reintentar
                </button>
                <a href="/dashboard" className="btn-secondary text-sm no-underline">
                    Ir al resumen
                </a>
            </div>
        </div>
    );
}

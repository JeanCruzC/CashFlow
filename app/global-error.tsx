"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="es">
            <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased flex items-center justify-center px-6">
                <div className="max-w-md w-full card p-6 text-center">
                    <h2 className="text-xl font-bold">Algo salió mal</h2>
                    <p className="text-muted mt-2">
                        Ocurrió un error inesperado. Puedes intentar nuevamente.
                    </p>
                    <button onClick={reset} className="btn-primary mt-5 text-sm">
                        Reintentar
                    </button>
                </div>
            </body>
        </html>
    );
}

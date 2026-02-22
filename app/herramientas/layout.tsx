import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Herramientas Financieras Gratuitas",
    description:
        "Calculadoras laborales y financieras para Perú, Colombia y Chile. Calcula tu liquidación, gratificación, prima y salario neto al instante.",
};

export default function HerramientasLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* ── Barra superior ── */}
            <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
                    <Link
                        href="/"
                        className="text-sm font-bold tracking-tight text-[var(--brand-primary)]"
                    >
                        ← CashFlow
                    </Link>
                    <Link
                        href="/herramientas"
                        className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        Todas las herramientas
                    </Link>
                </div>
            </header>

            {/* ── Contenido ── */}
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

            {/* ── CTA ── */}
            <footer className="border-t bg-[var(--surface-tint)] px-4 py-10 text-center">
                <p className="text-sm text-[var(--muted)]">
                    ¿Necesitas gestionar transacciones, presupuesto y flujo de caja?
                </p>
                <Link
                    href="/register"
                    className="mt-3 inline-block rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90"
                >
                    Crear cuenta gratis en CashFlow
                </Link>
            </footer>
        </div>
    );
}

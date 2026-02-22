import industries from "@/data/seo/industries.json";
import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";

export const metadata: Metadata = {
    title: "CashFlow para tu Industria | Plantillas de Control Financiero",
    description:
        "Soluciones financieras diseñadas para restaurantes, freelancers, startups, tiendas, agencias y más. Elige tu industria.",
    openGraph: {
        title: "CashFlow para tu Industria",
        description: "Plantillas de control financiero que se adaptan a tu negocio.",
    },
};

export default function PlantillasIndexPage() {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
                    <Link href="/" className="text-sm font-bold tracking-tight text-[var(--brand-primary)]">
                        ← CashFlow
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-12">
                <JsonLd
                    id="plantillas-collection"
                    data={{
                        "@context": "https://schema.org",
                        "@type": "CollectionPage",
                        name: "CashFlow para tu Industria",
                        description: "Plantillas de control financiero para cada sector.",
                    }}
                />

                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-black text-[var(--foreground)] md:text-4xl">
                        CashFlow para tu industria
                    </h1>
                    <p className="mt-3 text-sm text-[var(--muted)] md:text-base">
                        Cada negocio tiene necesidades financieras distintas. Encuentra la solución perfecta para el tuyo.
                    </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {industries.map((ind) => (
                        <Link
                            key={ind.slug}
                            href={`/plantillas/${ind.slug}`}
                            className="group rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                        >
                            <span className="text-3xl">{ind.emoji}</span>
                            <h2 className="mt-3 text-base font-bold text-[var(--foreground)] group-hover:text-[var(--brand-primary)] transition-colors">
                                CashFlow para {ind.nombre}
                            </h2>
                            <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed line-clamp-2">
                                {ind.descripcion}
                            </p>
                        </Link>
                    ))}
                </div>
            </main>

            <footer className="border-t bg-[var(--surface-tint)] px-4 py-10 text-center">
                <p className="text-sm text-[var(--muted)]">¿No ves tu industria? CashFlow se adapta a cualquier negocio.</p>
                <Link href="/register" className="mt-3 inline-block rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90">
                    Crear cuenta gratis
                </Link>
            </footer>
        </div>
    );
}

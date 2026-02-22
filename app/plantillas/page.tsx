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
        <div className="min-h-screen overflow-x-hidden bg-[#f3f8fc] text-[#0f172a]">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,#d6ecfa_0%,transparent_35%),radial-gradient(circle_at_88%_22%,#d8f1ee_0%,transparent_34%)]" />

            <header className="sticky top-0 z-50 border-b border-[#dce8f1]/80 bg-[#f3f8fc]/85 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D4C7A] shadow-[0_6px_16px_rgba(13,76,122,0.2)]">
                            <svg viewBox="0 0 48 48" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <rect x="7" y="10" width="34" height="28" rx="8" stroke="#FFFFFF" strokeWidth="3" />
                                <path d="M14 27C17 21 21 19 24 22C27 25 31 24 34 18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="text-base font-extrabold tracking-tight text-[#0F172A]">CashFlow</span>
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-12 md:px-8">
                <JsonLd id="plantillas-collection" data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "CashFlow para tu Industria", description: "Plantillas de control financiero para cada sector." }} />

                <div className="mb-10 max-w-3xl animate-fade-in-up">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">SEO programático</p>
                    <h1 className="mt-3 text-3xl font-black text-[#0f172a] md:text-4xl">CashFlow para tu industria</h1>
                    <p className="mt-4 text-sm leading-relaxed text-[#4b667c]">Cada negocio tiene necesidades financieras distintas. Encuentra la solución perfecta para el tuyo.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {industries.map((ind, index) => (
                        <Link
                            key={ind.slug}
                            href={`/plantillas/${ind.slug}`}
                            className="group animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)] transition-all hover:shadow-[0_16px_40px_rgba(13,60,95,0.14)] hover:-translate-y-0.5"
                            style={{ animationDelay: `${index * 60}ms` }}
                        >
                            <svg viewBox="0 0 180 18" className="mb-4 h-4 w-28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M2 9H100" stroke={index % 2 === 0 ? "#0D4C7A" : "#14847B"} strokeWidth="3" strokeLinecap="round" />
                                <circle cx="116" cy="9" r="6" stroke={index % 2 === 0 ? "#14847B" : "#0D4C7A"} strokeWidth="3" />
                            </svg>
                            <h2 className="text-base font-extrabold text-[#14324a] group-hover:text-[#0d4c7a] transition-colors">
                                CashFlow para {ind.nombre}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#4b677f] line-clamp-2">{ind.descripcion}</p>
                        </Link>
                    ))}
                </div>
            </main>

            <footer className="border-t border-[#d8e5ef] bg-[#edf4f9] px-5 py-10 md:px-8 text-center">
                <p className="text-sm text-[#4c6880]">¿No ves tu industria? CashFlow se adapta a cualquier negocio.</p>
                <Link href="/register" className="mt-3 inline-flex items-center justify-center rounded-2xl bg-[#0d4c7a] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#0b3f66]">
                    Crear cuenta gratis
                </Link>
            </footer>
        </div>
    );
}

import industries from "@/data/seo/industries.json";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";
import RegisterLink from "@/components/ui/RegisterLink";

type Industry = (typeof industries)[number];

export function generateStaticParams() {
    return industries.map((ind) => ({ industria: ind.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ industria: string }> }): Promise<Metadata> {
    const { industria } = await params;
    const ind = industries.find((i) => i.slug === industria);
    if (!ind) return {};
    const title = `CashFlow para ${ind.nombre} | Control Financiero ${ind.nombre}`;
    return {
        title,
        description: ind.descripcion,
        alternates: { canonical: absoluteUrl(`/plantillas/${ind.slug}`) },
        openGraph: { title, description: ind.descripcion, url: absoluteUrl(`/plantillas/${ind.slug}`) },
    };
}

export default async function IndustriaPage({ params }: { params: Promise<{ industria: string }> }) {
    const { industria } = await params;
    const ind: Industry | undefined = industries.find((i) => i.slug === industria);
    if (!ind) notFound();

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
                    <Link href="/plantillas" className="rounded-xl px-4 py-2 text-sm font-semibold text-[#37566f] transition-colors hover:text-[#0d4c7a]">
                        Ver todas las industrias
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-5 py-12 md:px-8">
                <JsonLd id={`industry-${ind.slug}`} data={{ "@context": "https://schema.org", "@type": "WebPage", name: `CashFlow para ${ind.nombre}`, description: ind.descripcion, url: absoluteUrl(`/plantillas/${ind.slug}`) }} />

                {/* Hero */}
                <div className="animate-fade-in-up text-center">
                    <svg viewBox="0 0 180 18" className="mx-auto mb-6 h-4 w-32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M2 9H132" stroke="#0D4C7A" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="146" cy="9" r="6" stroke="#0D4C7A" strokeWidth="3" />
                        <circle cx="168" cy="9" r="6" stroke="#14847B" strokeWidth="3" />
                    </svg>
                    <h1 className="text-3xl font-black text-[#0f172a] md:text-4xl">CashFlow para {ind.nombre}</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#3f5d76]">{ind.descripcion}</p>
                </div>

                {/* Problemas */}
                <section className="mt-14">
                    <div className="mb-6 max-w-3xl animate-fade-in-up">
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Desafíos comunes</p>
                        <h2 className="mt-3 text-2xl font-black text-[#0f172a]">Problemas financieros en {ind.nombre}</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {ind.problemas.map((p, i) => (
                            <article key={i} className="animate-fade-in-up rounded-3xl border border-[#f0d3d3] bg-[#fdf6f6] p-5" style={{ animationDelay: `${i * 80}ms` }}>
                                <p className="text-sm leading-relaxed text-[#7c2d2d]">{p}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Soluciones */}
                <section className="mt-14">
                    <div className="mb-6 max-w-3xl animate-fade-in-up">
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Soluciones CashFlow</p>
                        <h2 className="mt-3 text-2xl font-black text-[#0f172a]">Cómo CashFlow resuelve estos desafíos</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {ind.soluciones.map((s, i) => (
                            <article key={i} className="animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-5 shadow-[0_10px_30px_rgba(13,60,95,0.08)]" style={{ animationDelay: `${i * 80}ms` }}>
                                <p className="text-sm leading-relaxed text-[#1f3a52]">{s}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="mt-14">
                    <div className="rounded-[34px] border border-[#cfe0ec] bg-[linear-gradient(120deg,#0d4c7a_0%,#0f5f8f_58%,#14847b_100%)] px-8 py-10 text-center text-white shadow-[0_28px_54px_rgba(8,50,79,0.34)] md:px-12 md:py-14">
                        <h2 className="text-2xl font-black md:text-3xl">Empieza a controlar las finanzas de tu negocio</h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-[#d9ecf8]">Gratis. Sin tarjeta de crédito. Configura tu espacio en menos de 2 minutos.</p>
                        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                            <RegisterLink className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-[#0d4c7a] transition-colors hover:bg-[#ebf4fb]">
                                Crear cuenta gratis
                            </RegisterLink>
                            <Link href="/login" className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">
                                Ya tengo cuenta
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#d8e5ef] bg-[#edf4f9] px-5 py-8 md:px-8">
                <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 text-sm text-[#4c6880] md:flex-row md:items-center">
                    <p>© {new Date().getFullYear()} CashFlow</p>
                    <p>Aplicación financiera para control personal y empresarial.</p>
                </div>
            </footer>
        </div>
    );
}

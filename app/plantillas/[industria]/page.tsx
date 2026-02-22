import industries from "@/data/seo/industries.json";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/seo/site";

type Industry = (typeof industries)[number];

/* ── Generación estática ── */
export function generateStaticParams() {
    return industries.map((ind) => ({ industria: ind.slug }));
}

/* ── Metadata dinámica ── */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ industria: string }>;
}): Promise<Metadata> {
    const { industria } = await params;
    const ind = industries.find((i) => i.slug === industria);
    if (!ind) return {};

    const title = `CashFlow para ${ind.nombre} | Control Financiero ${ind.nombre}`;
    const description = ind.descripcion;

    return {
        title,
        description,
        alternates: { canonical: absoluteUrl(`/plantillas/${ind.slug}`) },
        openGraph: {
            title,
            description,
            url: absoluteUrl(`/plantillas/${ind.slug}`),
        },
    };
}

/* ── Página ── */
export default async function IndustriaPage({
    params,
}: {
    params: Promise<{ industria: string }>;
}) {
    const { industria } = await params;
    const ind: Industry | undefined = industries.find((i) => i.slug === industria);
    if (!ind) notFound();

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Nav */}
            <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
                    <Link href="/" className="text-sm font-bold tracking-tight text-[var(--brand-primary)]">← CashFlow</Link>
                    <Link href="/plantillas" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Ver todas las industrias</Link>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-12">
                <JsonLd
                    id={`industry-${ind.slug}`}
                    data={{
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        name: `CashFlow para ${ind.nombre}`,
                        description: ind.descripcion,
                        url: absoluteUrl(`/plantillas/${ind.slug}`),
                    }}
                />

                {/* ── Hero ── */}
                <div className="text-center">
                    <span className="text-5xl">{ind.emoji}</span>
                    <h1 className="mt-4 text-3xl font-black text-[var(--foreground)] md:text-4xl">
                        CashFlow para {ind.nombre}
                    </h1>
                    <p className="mt-3 text-base text-[var(--muted)]">{ind.descripcion}</p>
                </div>

                {/* ── Problemas ── */}
                <section className="mt-12">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">
                        Problemas financieros comunes en {ind.nombre}
                    </h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {ind.problemas.map((p, i) => (
                            <div key={i} className="rounded-2xl border border-red-100 bg-red-50 p-5">
                                <p className="text-sm leading-relaxed text-red-800">{p}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Soluciones ── */}
                <section className="mt-12">
                    <h2 className="text-xl font-bold text-[var(--foreground)]">
                        Cómo CashFlow resuelve estos desafíos
                    </h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {ind.soluciones.map((s, i) => (
                            <div key={i} className="rounded-2xl border border-[var(--brand-accent)]/20 bg-[#f0faf9] p-5">
                                <p className="text-sm leading-relaxed text-[#1a5c56]">{s}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── CTA ── */}
                <section className="mt-14 rounded-3xl bg-[linear-gradient(120deg,#0d4c7a_0%,#0f5f8f_58%,#14847b_100%)] px-8 py-10 text-center text-white shadow-xl">
                    <h2 className="text-2xl font-black md:text-3xl">
                        Empieza a controlar las finanzas de tu {ind.nombre.toLowerCase()}
                    </h2>
                    <p className="mt-3 text-sm text-white/80">
                        Gratis. Sin tarjeta de crédito. Configura tu espacio en menos de 2 minutos.
                    </p>
                    <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                        <Link href="/register" className="rounded-2xl bg-white px-6 py-3 text-sm font-bold text-[#0d4c7a] transition-colors hover:bg-[#ebf4fb]">
                            Crear cuenta gratis
                        </Link>
                        <Link href="/login" className="rounded-2xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10">
                            Ya tengo cuenta
                        </Link>
                    </div>
                </section>
            </main>

            <footer className="border-t bg-[var(--surface-tint)] px-4 py-8 text-center">
                <p className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} CashFlow</p>
            </footer>
        </div>
    );
}

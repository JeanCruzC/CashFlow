import Link from "next/link";
import type { Metadata } from "next";
import JsonLd from "@/components/seo/JsonLd";

export const metadata: Metadata = {
    title: "Herramientas Financieras Gratuitas | CashFlow",
    description:
        "Calculadoras laborales para Perú, Colombia y Chile. Liquidación, gratificación, prima de servicios y salario neto. 100% gratis.",
    openGraph: {
        title: "Herramientas Financieras Gratuitas | CashFlow",
        description:
            "Calculadoras laborales para Perú, Colombia y Chile. Liquidación, gratificación, prima y salario neto.",
    },
};

const tools = [
    {
        href: "/herramientas/calculadora-liquidacion",
        emoji: "📋",
        title: "Calculadora de Liquidación",
        description: "Calcula tu liquidación al salir de una empresa en Perú, Colombia o Chile.",
        countries: ["🇵🇪", "🇨🇴", "🇨🇱"],
    },
    {
        href: "/herramientas/calculadora-gratificacion",
        emoji: "🎁",
        title: "Calculadora de Gratificación / Prima",
        description: "Calcula tu gratificación (Perú), prima de servicios (Colombia) o aguinaldo (Chile).",
        countries: ["🇵🇪", "🇨🇴", "🇨🇱"],
    },
    {
        href: "/herramientas/calculadora-salario-neto-peru",
        emoji: "💰",
        title: "Calculadora de Salario Neto",
        description: "Calcula tu sueldo neto con ONP/AFP, EsSalud, IR 5ta categoría y más. Solo Perú.",
        countries: ["🇵🇪"],
    },
];

export default function HerramientasPage() {
    return (
        <>
            <JsonLd
                id="tools-collection"
                data={{
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    name: "Herramientas Financieras Gratuitas",
                    description: "Calculadoras laborales para Perú, Colombia y Chile.",
                    url: "https://onecashflow.vercel.app/herramientas",
                }}
            />

            <div className="mb-10 text-center">
                <h1 className="text-3xl font-black text-[var(--foreground)] md:text-4xl">
                    Herramientas Financieras Gratuitas
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] md:text-base">
                    Calculadoras laborales precisas para Perú, Colombia y Chile. Sin registro, sin costo.
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className="group rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                    >
                        <span className="text-3xl">{tool.emoji}</span>
                        <h2 className="mt-3 text-base font-bold text-[var(--foreground)] group-hover:text-[var(--brand-primary)] transition-colors">
                            {tool.title}
                        </h2>
                        <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">{tool.description}</p>
                        <div className="mt-3 flex gap-1.5">
                            {tool.countries.map((flag) => (
                                <span key={flag} className="text-lg">{flag}</span>
                            ))}
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}

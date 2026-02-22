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
        title: "Calculadora de Liquidación",
        description: "Calcula tu liquidación al salir de una empresa. CTS, gratificación trunca, vacaciones, cesantías e indemnización.",
        note: "Perú · Colombia · Chile",
        strokePrimary: "#0D4C7A",
        strokeAccent: "#14847B",
    },
    {
        href: "/herramientas/calculadora-gratificacion",
        title: "Gratificación y Prima",
        description: "Calcula tu gratificación, prima de servicios o aguinaldo según la legislación vigente de tu país.",
        note: "Perú · Colombia · Chile",
        strokePrimary: "#14847B",
        strokeAccent: "#0D4C7A",
    },
    {
        href: "/herramientas/calculadora-salario-neto-peru",
        title: "Salario Neto Perú 2025",
        description: "Calcula tu sueldo neto con descuentos de ONP o AFP, EsSalud, Seguro Vida Ley e IR de 5ta categoría.",
        note: "Solo Perú",
        strokePrimary: "#0D4C7A",
        strokeAccent: "#14847B",
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

            <div className="mb-10 max-w-3xl animate-fade-in-up">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Herramientas gratuitas</p>
                <h1 className="mt-3 text-3xl font-black text-[#0f172a] md:text-4xl">
                    Calculadoras laborales para Latinoamérica
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-[#4b667c]">
                    Herramientas públicas, sin registro, diseñadas para profesionales y emprendedores en Perú, Colombia y Chile.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {tools.map((tool, index) => (
                    <Link
                        key={tool.href}
                        href={tool.href}
                        className="group animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)] transition-all hover:shadow-[0_16px_40px_rgba(13,60,95,0.14)] hover:-translate-y-0.5"
                        style={{ animationDelay: `${index * 80}ms` }}
                    >
                        <svg viewBox="0 0 180 18" className="mb-4 h-4 w-32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M2 9H132" stroke={tool.strokePrimary} strokeWidth="3" strokeLinecap="round" />
                            <circle cx="146" cy="9" r="6" stroke={tool.strokePrimary} strokeWidth="3" />
                            <circle cx="168" cy="9" r="6" stroke={tool.strokeAccent} strokeWidth="3" />
                        </svg>
                        <h2 className="text-lg font-extrabold text-[#14324a] group-hover:text-[#0d4c7a] transition-colors">
                            {tool.title}
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-[#4b677f]">{tool.description}</p>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#4a6275]">{tool.note}</p>
                    </Link>
                ))}
            </div>
        </>
    );
}

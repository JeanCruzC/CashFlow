"use client";

import { useState } from "react";
import JsonLd from "@/components/seo/JsonLd";
import {
    calcularLiquidacionPeru,
    calcularLiquidacionColombia,
    calcularLiquidacionChile,
    type Country,
    type CausalChile,
} from "@/lib/calculadoras/liquidacion";

const META_TITLE = "Calculadora de Liquidación Laboral | Perú, Colombia y Chile";
const META_DESC =
    "Calcula tu liquidación laboral al salir de una empresa. CTS, gratificación, vacaciones, cesantías, prima e indemnización. Gratis y al instante.";

/* eslint-disable @next/next/no-head-element */

export default function CalculadoraLiquidacion() {
    const [country, setCountry] = useState<Country>("peru");
    const [sueldo, setSueldo] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaCese, setFechaCese] = useState("");
    const [asigFamiliar, setAsigFamiliar] = useState(false);
    const [auxTransporte, setAuxTransporte] = useState(false);
    const [causalChile, setCausalChile] = useState<CausalChile>("necesidades_empresa");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    function handleCalcular() {
        setError("");
        setResult(null);
        const s = parseFloat(sueldo);
        if (!s || s <= 0) { setError("Ingresa un sueldo válido."); return; }
        if (!fechaInicio || !fechaCese) { setError("Selecciona ambas fechas."); return; }
        const fi = new Date(fechaInicio);
        const fc = new Date(fechaCese);
        if (fc <= fi) { setError("La fecha de cese debe ser posterior al inicio."); return; }

        if (country === "peru") {
            setResult(calcularLiquidacionPeru({ sueldoBruto: s, asignacionFamiliar: asigFamiliar, fechaInicio: fi, fechaCese: fc }));
        } else if (country === "colombia") {
            setResult(calcularLiquidacionColombia({ salarioMensual: s, auxilioTransporte: auxTransporte, fechaInicio: fi, fechaCese: fc }));
        } else {
            setResult(calcularLiquidacionChile({ remuneracionImponible: s, fechaInicio: fi, fechaCese: fc, causal: causalChile }));
        }
    }

    const currencySymbol = country === "peru" ? "S/" : country === "colombia" ? "COP" : "CLP";

    return (
        <>
            <head>
                <title>{META_TITLE}</title>
                <meta name="description" content={META_DESC} />
            </head>

            <JsonLd
                id="liquidacion-calc"
                data={{
                    "@context": "https://schema.org",
                    "@type": "WebApplication",
                    name: META_TITLE,
                    description: META_DESC,
                    applicationCategory: "FinanceApplication",
                    operatingSystem: "Web",
                    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                }}
            />

            <div className="mx-auto max-w-2xl">
                <div className="animate-fade-in-up">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Herramienta gratuita</p>
                    <h1 className="mt-3 text-2xl font-black text-[#0f172a] md:text-3xl">
                        Calculadora de Liquidación Laboral
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-[#4b667c]">
                        Calcula tu liquidación al salir de una empresa en Perú, Colombia o Chile.
                    </p>
                </div>

                {/* ── Selector país ── */}
                <div className="mt-6 flex gap-2">
                    {(["peru", "colombia", "chile"] as const).map((c) => (
                        <button
                            key={c}
                            onClick={() => { setCountry(c); setResult(null); }}
                            className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all ${country === c
                                    ? "border-[#0d4c7a] bg-[#0d4c7a] text-white shadow-[0_6px_16px_rgba(13,76,122,0.2)]"
                                    : "border-[#d7e5ef] bg-white text-[#14324a] hover:border-[#9fc1d8]"
                                }`}
                        >
                            {c === "peru" ? "Perú" : c === "colombia" ? "Colombia" : "Chile"}
                        </button>
                    ))}
                </div>

                {/* ── Formulario ── */}
                <div className="mt-6 space-y-4 rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)]">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">
                            {country === "chile" ? "Remuneración imponible" : "Sueldo mensual"} ({currencySymbol})
                        </label>
                        <input
                            type="number"
                            value={sueldo}
                            onChange={(e) => setSueldo(e.target.value)}
                            placeholder={country === "peru" ? "1800" : country === "colombia" ? "2000000" : "800000"}
                            className="mt-1.5 w-full rounded-xl border border-[#d7e5ef] bg-[#f8fbfd] px-4 py-2.5 text-sm text-[#14324a] placeholder:text-[#8da4b8] focus:border-[#0d4c7a] focus:outline-none focus:ring-2 focus:ring-[#0d4c7a]/20"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">Fecha de inicio</label>
                            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5ef] bg-[#f8fbfd] px-4 py-2.5 text-sm text-[#14324a] focus:border-[#0d4c7a] focus:outline-none focus:ring-2 focus:ring-[#0d4c7a]/20" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">Fecha de cese</label>
                            <input type="date" value={fechaCese} onChange={(e) => setFechaCese(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5ef] bg-[#f8fbfd] px-4 py-2.5 text-sm text-[#14324a] focus:border-[#0d4c7a] focus:outline-none focus:ring-2 focus:ring-[#0d4c7a]/20" />
                        </div>
                    </div>

                    {country === "peru" && (
                        <label className="flex items-center gap-2.5 text-sm font-medium text-[#1f3a52]">
                            <input type="checkbox" checked={asigFamiliar} onChange={(e) => setAsigFamiliar(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5ef] text-[#0d4c7a] focus:ring-[#0d4c7a]" />
                            Tengo asignación familiar (S/ 113)
                        </label>
                    )}

                    {country === "colombia" && (
                        <label className="flex items-center gap-2.5 text-sm font-medium text-[#1f3a52]">
                            <input type="checkbox" checked={auxTransporte} onChange={(e) => setAuxTransporte(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5ef] text-[#0d4c7a] focus:ring-[#0d4c7a]" />
                            Gano ≤ 2 SMLMV (tengo auxilio de transporte)
                        </label>
                    )}

                    {country === "chile" && (
                        <div>
                            <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">Causal de término</label>
                            <select value={causalChile} onChange={(e) => setCausalChile(e.target.value as CausalChile)} className="mt-1.5 w-full rounded-xl border border-[#d7e5ef] bg-[#f8fbfd] px-4 py-2.5 text-sm text-[#14324a] focus:border-[#0d4c7a] focus:outline-none focus:ring-2 focus:ring-[#0d4c7a]/20">
                                <option value="necesidades_empresa">Necesidades de la empresa (despido)</option>
                                <option value="renuncia_voluntaria">Renuncia voluntaria</option>
                                <option value="mutuo_acuerdo">Mutuo acuerdo</option>
                            </select>
                        </div>
                    )}

                    {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

                    <button onClick={handleCalcular} className="w-full rounded-2xl bg-[#0d4c7a] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#0b3f66] shadow-[0_6px_16px_rgba(13,76,122,0.2)]">
                        Calcular liquidación
                    </button>
                </div>

                {/* ── Resultado ── */}
                {result && (
                    <div className="mt-6 animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_18px_34px_rgba(10,63,93,0.08)]">
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Resultado</p>
                        <div className="mt-4 space-y-2.5">
                            {Object.entries(result.desglose as Record<string, number>).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between text-sm">
                                    <span className="text-[#4b677f]">{key}</span>
                                    <span className="font-semibold text-[#14324a]">
                                        {currencySymbol} {(val as number).toLocaleString("es", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[#e5edf4] pt-4">
                            <span className="font-extrabold text-[#14324a]">Total liquidación</span>
                            <span className="text-xl font-black text-[#0d4c7a]">
                                {currencySymbol} {(result.total as number).toLocaleString("es", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <p className="mt-3 text-xs text-[#6b8299]">
                            * Este cálculo es referencial. Consulta con un profesional o con el Ministerio de Trabajo de tu país.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

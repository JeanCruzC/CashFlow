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
                <h1 className="text-2xl font-black text-[var(--foreground)] md:text-3xl">
                    📋 Calculadora de Liquidación Laboral
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                    Calcula tu liquidación al salir de una empresa en Perú, Colombia o Chile.
                </p>

                {/* ── Selector país ── */}
                <div className="mt-6 flex gap-2">
                    {(["peru", "colombia", "chile"] as const).map((c) => (
                        <button
                            key={c}
                            onClick={() => { setCountry(c); setResult(null); }}
                            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${country === c
                                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                                : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-tint)]"
                                }`}
                        >
                            {c === "peru" ? "🇵🇪 Perú" : c === "colombia" ? "🇨🇴 Colombia" : "🇨🇱 Chile"}
                        </button>
                    ))}
                </div>

                {/* ── Formulario ── */}
                <div className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6">
                    <div>
                        <label className="label">
                            {country === "chile" ? "Remuneración imponible" : "Sueldo mensual"} ({currencySymbol})
                        </label>
                        <input
                            type="number"
                            value={sueldo}
                            onChange={(e) => setSueldo(e.target.value)}
                            placeholder={country === "peru" ? "1800" : country === "colombia" ? "2000000" : "800000"}
                            className="input-field"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Fecha de inicio</label>
                            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input-field" />
                        </div>
                        <div>
                            <label className="label">Fecha de cese</label>
                            <input type="date" value={fechaCese} onChange={(e) => setFechaCese(e.target.value)} className="input-field" />
                        </div>
                    </div>

                    {/* Campos condicionales */}
                    {country === "peru" && (
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={asigFamiliar} onChange={(e) => setAsigFamiliar(e.target.checked)} className="rounded" />
                            Tengo asignación familiar (S/ 113)
                        </label>
                    )}

                    {country === "colombia" && (
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={auxTransporte} onChange={(e) => setAuxTransporte(e.target.checked)} className="rounded" />
                            Gano ≤ 2 SMLMV (tengo auxilio de transporte)
                        </label>
                    )}

                    {country === "chile" && (
                        <div>
                            <label className="label">Causal de término</label>
                            <select value={causalChile} onChange={(e) => setCausalChile(e.target.value as CausalChile)} className="input-field">
                                <option value="necesidades_empresa">Necesidades de la empresa (despido)</option>
                                <option value="renuncia_voluntaria">Renuncia voluntaria</option>
                                <option value="mutuo_acuerdo">Mutuo acuerdo</option>
                            </select>
                        </div>
                    )}

                    {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                    <button onClick={handleCalcular} className="btn-primary w-full">
                        Calcular liquidación
                    </button>
                </div>

                {/* ── Resultado ── */}
                {result && (
                    <div className="mt-6 rounded-2xl border border-[var(--brand-accent)]/30 bg-[#f0faf9] p-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-[var(--foreground)]">Resultado de tu liquidación</h2>
                        <div className="mt-4 space-y-2">
                            {Object.entries(result.desglose as Record<string, number>).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--muted)]">{key}</span>
                                    <span className="font-semibold">
                                        {currencySymbol} {(val as number).toLocaleString("es", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                            <span className="font-bold text-[var(--foreground)]">Total liquidación</span>
                            <span className="text-xl font-black text-[var(--brand-primary)]">
                                {currencySymbol} {(result.total as number).toLocaleString("es", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <p className="mt-3 text-xs text-[var(--muted)]">
                            * Este cálculo es referencial. Consulta con un profesional o con el Ministerio de Trabajo de tu país.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

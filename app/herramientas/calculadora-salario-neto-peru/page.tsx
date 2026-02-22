"use client";

import { useState } from "react";
import JsonLd from "@/components/seo/JsonLd";
import {
    calcularSalarioNeto,
    type SistemaPensiones,
    AFP_DATA,
    UIT_2025,
    RMV_2025,
    ESSALUD_TASA,
} from "@/lib/calculadoras/salario-neto";

const META_TITLE = "Calculadora de Salario Neto Perú 2025 | ONP, AFP, EsSalud, IR 5ta";
const META_DESC =
    "Calcula tu sueldo neto en Perú 2025. Descuentos de ONP/AFP, Impuesto a la Renta de 5ta categoría, EsSalud y Seguro Vida Ley. Gratis.";

/* eslint-disable @next/next/no-head-element */

export default function CalculadoraSalarioNetoPeru() {
    const [sueldo, setSueldo] = useState("");
    const [asigFamiliar, setAsigFamiliar] = useState(false);
    const [sistema, setSistema] = useState<SistemaPensiones>("onp");
    const [gratificaciones, setGratificaciones] = useState(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    function handleCalcular() {
        setError("");
        setResult(null);
        const s = parseFloat(sueldo);
        if (!s || s <= 0) { setError("Ingresa un sueldo bruto válido."); return; }
        setResult(calcularSalarioNeto({ sueldoBruto: s, asignacionFamiliar: asigFamiliar, sistemaPensiones: sistema, gratificaciones }));
    }

    const inputClass = "mt-1.5 w-full rounded-xl border border-[#d7e5ef] bg-[#f8fbfd] px-4 py-2.5 text-sm text-[#14324a] placeholder:text-[#8da4b8] focus:border-[#0d4c7a] focus:outline-none focus:ring-2 focus:ring-[#0d4c7a]/20";
    const labelClass = "text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]";

    return (
        <>
            <head><title>{META_TITLE}</title><meta name="description" content={META_DESC} /></head>

            <JsonLd id="salario-neto-calc" data={{ "@context": "https://schema.org", "@type": "WebApplication", name: META_TITLE, description: META_DESC, applicationCategory: "FinanceApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }} />

            <div className="mx-auto max-w-2xl">
                <div className="animate-fade-in-up">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Herramienta gratuita · Solo Perú</p>
                    <h1 className="mt-3 text-2xl font-black text-[#0f172a] md:text-3xl">Calculadora de Salario Neto — Perú 2025</h1>
                    <p className="mt-3 text-sm leading-relaxed text-[#4b667c]">Calcula tu sueldo neto con descuentos de ONP/AFP, IR 5ta categoría, EsSalud y más.</p>
                </div>

                {/* Info rápida */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                        { label: "RMV 2025", value: `S/ ${RMV_2025.toLocaleString()}` },
                        { label: "UIT 2025", value: `S/ ${UIT_2025.toLocaleString()}` },
                        { label: "EsSalud", value: `${(ESSALUD_TASA * 100).toFixed(0)}% (empleador)` },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-[#e5edf4] bg-[#f8fbfd] p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4a6275]">{item.label}</p>
                            <p className="mt-1 text-sm font-extrabold text-[#14324a]">{item.value}</p>
                        </div>
                    ))}
                </div>

                {/* Form */}
                <div className="mt-6 space-y-4 rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)]">
                    <div><label className={labelClass}>Sueldo bruto mensual (S/)</label><input type="number" value={sueldo} onChange={(e) => setSueldo(e.target.value)} placeholder="3000" className={inputClass} /></div>
                    <div>
                        <label className={labelClass}>Sistema de pensiones</label>
                        <select value={sistema} onChange={(e) => setSistema(e.target.value as SistemaPensiones)} className={inputClass}>
                            <option value="onp">ONP (13%)</option>
                            {Object.entries(AFP_DATA).map(([name, data]) => (<option key={name} value={name}>AFP {name.charAt(0).toUpperCase() + name.slice(1)} ({(data.total * 100).toFixed(2)}%)</option>))}
                        </select>
                    </div>
                    <label className="flex items-center gap-2.5 text-sm font-medium text-[#1f3a52]"><input type="checkbox" checked={asigFamiliar} onChange={(e) => setAsigFamiliar(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5ef] text-[#0d4c7a]" /> Tengo asignación familiar (S/ 113)</label>
                    <label className="flex items-center gap-2.5 text-sm font-medium text-[#1f3a52]"><input type="checkbox" checked={gratificaciones} onChange={(e) => setGratificaciones(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5ef] text-[#0d4c7a]" /> Incluir gratificaciones en cálculo de IR (recomendado)</label>
                    {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
                    <button onClick={handleCalcular} className="w-full rounded-2xl bg-[#0d4c7a] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#0b3f66] shadow-[0_6px_16px_rgba(13,76,122,0.2)]">Calcular salario neto</button>
                </div>

                {/* Resultado */}
                {result && (
                    <div className="mt-6 space-y-4 animate-fade-in-up">
                        <div className="rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_18px_34px_rgba(10,63,93,0.08)]">
                            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Tu salario neto mensual</p>
                            <p className="mt-2 text-3xl font-black text-[#0d4c7a]">S/ {result.salarioNeto.toLocaleString("es", { minimumFractionDigits: 2 })}</p>
                            <div className="mt-4 space-y-2.5">
                                {Object.entries(result.desglose as Record<string, number>).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                        <span className="text-[#4b677f]">{key}</span>
                                        <span className={`font-semibold ${(val as number) < 0 ? "text-red-600" : "text-[#14324a]"}`}>S/ {(val as number).toLocaleString("es", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)]">
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">Detalle de descuentos</p>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-[#4b677f]">{result.descuentoPensionesDetalle}</span><span className="font-semibold text-red-600">-S/ {result.descuentoPensiones.toLocaleString("es", { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between"><span className="text-[#4b677f]">IR 5ta Categoría (mensual)</span><span className="font-semibold text-red-600">{result.impuestoRentaMensual > 0 ? `-S/ ${result.impuestoRentaMensual.toLocaleString("es", { minimumFractionDigits: 2 })}` : "Exonerado"}</span></div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)]">
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]">Costo del empleador (no se descuenta de tu sueldo)</p>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-[#4b677f]">EsSalud (9%)</span><span className="font-semibold text-[#14324a]">S/ {result.costoEmpleador.essalud.toLocaleString("es", { minimumFractionDigits: 2 })}</span></div>
                                <div className="flex justify-between"><span className="text-[#4b677f]">Seguro Vida Ley</span><span className="text-sm text-[#6b8299]">{result.costoEmpleador.seguroVidaLey}</span></div>
                            </div>
                        </div>

                        <p className="text-xs text-[#6b8299]">* Cálculo referencial basado en tasas vigentes 2025. UIT = S/ {UIT_2025.toLocaleString()}. Consulta con SUNAT para tu caso específico.</p>
                    </div>
                )}
            </div>
        </>
    );
}

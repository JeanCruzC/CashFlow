"use client";

import { useState } from "react";
import JsonLd from "@/components/seo/JsonLd";
import {
    calcularGratificacionPeru,
    calcularPrimaColombia,
    calcularAguinaldoChile,
    type Country,
} from "@/lib/calculadoras/gratificacion";

const META_TITLE = "Calculadora de Gratificación y Prima | Perú, Colombia, Chile";
const META_DESC =
    "Calcula tu gratificación (Perú), prima de servicios (Colombia) o aguinaldo (Chile). Fórmula oficial, gratis y al instante.";

/* eslint-disable @next/next/no-head-element */

export default function CalculadoraGratificacion() {
    const [country, setCountry] = useState<Country>("peru");

    const [sueldoPeru, setSueldoPeru] = useState("");
    const [mesesPeru, setMesesPeru] = useState("6");
    const [asigFamiliar, setAsigFamiliar] = useState(false);
    const [afiliadoEPS, setAfiliadoEPS] = useState(false);

    const [salarioCo, setSalarioCo] = useState("");
    const [auxTrans, setAuxTrans] = useState(false);
    const [fechaInicioCo, setFechaInicioCo] = useState("");
    const [fechaFinCo, setFechaFinCo] = useState("");

    const [montoCl, setMontoCl] = useState("");
    const [mesesCl, setMesesCl] = useState("12");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");

    function handleCalcular() {
        setError("");
        setResult(null);

        if (country === "peru") {
            const s = parseFloat(sueldoPeru);
            if (!s || s <= 0) { setError("Ingresa un sueldo válido."); return; }
            const r = calcularGratificacionPeru({
                sueldoBruto: s, asignacionFamiliar: asigFamiliar,
                mesesTrabajadosSemestre: parseInt(mesesPeru), afiliadoEPS,
            });
            setResult({ items: { "Gratificación base": r.gratificacionBase, "Bonificación extraordinaria": r.bonificacionExtraordinaria }, total: r.totalGratificacion, label: "Total gratificación", currency: "S/" });
        } else if (country === "colombia") {
            const s = parseFloat(salarioCo);
            if (!s || s <= 0) { setError("Ingresa un salario válido."); return; }
            if (!fechaInicioCo || !fechaFinCo) { setError("Selecciona ambas fechas."); return; }
            const r = calcularPrimaColombia({ salarioMensual: s, auxilioTransporte: auxTrans, fechaInicioSemestre: new Date(fechaInicioCo), fechaFinSemestre: new Date(fechaFinCo) });
            setResult({ items: { "Días trabajados en semestre": r.diasTrabajados }, total: r.primaServicios, label: "Prima de servicios", currency: "COP" });
        } else {
            const m = parseFloat(montoCl);
            if (!m || m <= 0) { setError("Ingresa un monto de aguinaldo válido."); return; }
            const r = calcularAguinaldoChile({ montoAguinaldo: m, mesesTrabajados: parseInt(mesesCl) });
            setResult({ items: { "Meses trabajados": parseInt(mesesCl) }, total: r.aguinaldoProporcional, label: "Aguinaldo proporcional", currency: "CLP" });
        }
    }

    const inputClass = "mt-1.5 w-full rounded-xl border border-[#d7e5ef] bg-[#f8fbfd] px-4 py-2.5 text-sm text-[#14324a] placeholder:text-[#8da4b8] focus:border-[#0d4c7a] focus:outline-none focus:ring-2 focus:ring-[#0d4c7a]/20";
    const labelClass = "text-xs font-bold uppercase tracking-[0.15em] text-[#355e7c]";

    return (
        <>
            <head><title>{META_TITLE}</title><meta name="description" content={META_DESC} /></head>

            <JsonLd id="grat-calc" data={{ "@context": "https://schema.org", "@type": "WebApplication", name: META_TITLE, description: META_DESC, applicationCategory: "FinanceApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }} />

            <div className="mx-auto max-w-2xl">
                <div className="animate-fade-in-up">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Herramienta gratuita</p>
                    <h1 className="mt-3 text-2xl font-black text-[#0f172a] md:text-3xl">Gratificación, Prima y Aguinaldo</h1>
                    <p className="mt-3 text-sm leading-relaxed text-[#4b667c]">Calcula tu gratificación (Perú), prima de servicios (Colombia) o aguinaldo (Chile).</p>
                </div>

                {/* País */}
                <div className="mt-6 flex gap-2">
                    {(["peru", "colombia", "chile"] as const).map((c) => (
                        <button key={c} onClick={() => { setCountry(c); setResult(null); }}
                            className={`flex-1 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all ${country === c ? "border-[#0d4c7a] bg-[#0d4c7a] text-white shadow-[0_6px_16px_rgba(13,76,122,0.2)]" : "border-[#d7e5ef] bg-white text-[#14324a] hover:border-[#9fc1d8]"}`}>
                            {c === "peru" ? "Perú" : c === "colombia" ? "Colombia" : "Chile"}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <div className="mt-6 space-y-4 rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_10px_30px_rgba(13,60,95,0.08)]">
                    {country === "peru" && (
                        <>
                            <div><label className={labelClass}>Sueldo bruto mensual (S/)</label><input type="number" value={sueldoPeru} onChange={(e) => setSueldoPeru(e.target.value)} placeholder="1800" className={inputClass} /></div>
                            <div><label className={labelClass}>Meses trabajados en el semestre</label><select value={mesesPeru} onChange={(e) => setMesesPeru(e.target.value)} className={inputClass}>{[1, 2, 3, 4, 5, 6].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}</select></div>
                            <label className="flex items-center gap-2.5 text-sm font-medium text-[#1f3a52]"><input type="checkbox" checked={asigFamiliar} onChange={(e) => setAsigFamiliar(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5ef] text-[#0d4c7a]" /> Tengo asignación familiar (S/ 113)</label>
                            <label className="flex items-center gap-2.5 text-sm font-medium text-[#1f3a52]"><input type="checkbox" checked={afiliadoEPS} onChange={(e) => setAfiliadoEPS(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5ef] text-[#0d4c7a]" /> Estoy afiliado a una EPS (bono 6.75% en vez de 9%)</label>
                        </>
                    )}
                    {country === "colombia" && (
                        <>
                            <div><label className={labelClass}>Salario mensual (COP)</label><input type="number" value={salarioCo} onChange={(e) => setSalarioCo(e.target.value)} placeholder="2000000" className={inputClass} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className={labelClass}>Inicio del semestre</label><input type="date" value={fechaInicioCo} onChange={(e) => setFechaInicioCo(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Fin del semestre</label><input type="date" value={fechaFinCo} onChange={(e) => setFechaFinCo(e.target.value)} className={inputClass} /></div>
                            </div>
                            <label className="flex items-center gap-2.5 text-sm font-medium text-[#1f3a52]"><input type="checkbox" checked={auxTrans} onChange={(e) => setAuxTrans(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5ef] text-[#0d4c7a]" /> Gano ≤ 2 SMLMV (tengo auxilio de transporte)</label>
                        </>
                    )}
                    {country === "chile" && (
                        <>
                            <div><label className={labelClass}>Monto de aguinaldo (CLP)</label><input type="number" value={montoCl} onChange={(e) => setMontoCl(e.target.value)} placeholder="100000" className={inputClass} /></div>
                            <div><label className={labelClass}>Meses trabajados en el año</label><select value={mesesCl} onChange={(e) => setMesesCl(e.target.value)} className={inputClass}>{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}</select></div>
                        </>
                    )}
                    {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
                    <button onClick={handleCalcular} className="w-full rounded-2xl bg-[#0d4c7a] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#0b3f66] shadow-[0_6px_16px_rgba(13,76,122,0.2)]">Calcular</button>
                </div>

                {/* Resultado */}
                {result && (
                    <div className="mt-6 animate-fade-in-up rounded-3xl border border-[#d7e5ef] bg-white p-6 shadow-[0_18px_34px_rgba(10,63,93,0.08)]">
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#3e6785]">Resultado</p>
                        <div className="mt-4 space-y-2.5">
                            {Object.entries(result.items as Record<string, number>).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between text-sm">
                                    <span className="text-[#4b677f]">{key}</span>
                                    <span className="font-semibold text-[#14324a]">{typeof val === "number" && val > 100 ? `${result.currency} ${val.toLocaleString("es", { minimumFractionDigits: 2 })}` : val}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-[#e5edf4] pt-4">
                            <span className="font-extrabold text-[#14324a]">{result.label}</span>
                            <span className="text-xl font-black text-[#0d4c7a]">{result.currency} {(result.total as number).toLocaleString("es", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <p className="mt-3 text-xs text-[#6b8299]">* Cálculo referencial. Consulta con un profesional o con el Ministerio de Trabajo de tu país.</p>
                    </div>
                )}
            </div>
        </>
    );
}

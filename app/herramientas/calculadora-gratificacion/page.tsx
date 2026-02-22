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

    // Perú
    const [sueldoPeru, setSueldoPeru] = useState("");
    const [mesesPeru, setMesesPeru] = useState("6");
    const [asigFamiliar, setAsigFamiliar] = useState(false);
    const [afiliadoEPS, setAfiliadoEPS] = useState(false);

    // Colombia
    const [salarioCo, setSalarioCo] = useState("");
    const [auxTrans, setAuxTrans] = useState(false);
    const [fechaInicioCo, setFechaInicioCo] = useState("");
    const [fechaFinCo, setFechaFinCo] = useState("");

    // Chile
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
                sueldoBruto: s,
                asignacionFamiliar: asigFamiliar,
                mesesTrabajadosSemestre: parseInt(mesesPeru),
                afiliadoEPS,
            });
            setResult({
                items: {
                    "Gratificación base": r.gratificacionBase,
                    "Bonificación extraordinaria": r.bonificacionExtraordinaria,
                },
                total: r.totalGratificacion,
                label: "Total gratificación",
                currency: "S/",
            });
        } else if (country === "colombia") {
            const s = parseFloat(salarioCo);
            if (!s || s <= 0) { setError("Ingresa un salario válido."); return; }
            if (!fechaInicioCo || !fechaFinCo) { setError("Selecciona ambas fechas."); return; }
            const r = calcularPrimaColombia({
                salarioMensual: s,
                auxilioTransporte: auxTrans,
                fechaInicioSemestre: new Date(fechaInicioCo),
                fechaFinSemestre: new Date(fechaFinCo),
            });
            setResult({
                items: {
                    "Días trabajados en semestre": r.diasTrabajados,
                },
                total: r.primaServicios,
                label: "Prima de servicios",
                currency: "COP",
            });
        } else {
            const m = parseFloat(montoCl);
            if (!m || m <= 0) { setError("Ingresa un monto de aguinaldo válido."); return; }
            const r = calcularAguinaldoChile({
                montoAguinaldo: m,
                mesesTrabajados: parseInt(mesesCl),
            });
            setResult({
                items: {
                    "Meses trabajados": parseInt(mesesCl),
                },
                total: r.aguinaldoProporcional,
                label: "Aguinaldo proporcional",
                currency: "CLP",
            });
        }
    }

    return (
        <>
            <head>
                <title>{META_TITLE}</title>
                <meta name="description" content={META_DESC} />
            </head>

            <JsonLd
                id="grat-calc"
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
                    🎁 Calculadora de Gratificación / Prima
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                    Calcula tu gratificación (Perú), prima de servicios (Colombia) o aguinaldo (Chile).
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

                {/* ── Formularios por país ── */}
                <div className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6">
                    {country === "peru" && (
                        <>
                            <div>
                                <label className="label">Sueldo bruto mensual (S/)</label>
                                <input type="number" value={sueldoPeru} onChange={(e) => setSueldoPeru(e.target.value)} placeholder="1800" className="input-field" />
                            </div>
                            <div>
                                <label className="label">Meses trabajados en el semestre</label>
                                <select value={mesesPeru} onChange={(e) => setMesesPeru(e.target.value)} className="input-field">
                                    {[1, 2, 3, 4, 5, 6].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}
                                </select>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={asigFamiliar} onChange={(e) => setAsigFamiliar(e.target.checked)} className="rounded" />
                                Tengo asignación familiar (S/ 113)
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={afiliadoEPS} onChange={(e) => setAfiliadoEPS(e.target.checked)} className="rounded" />
                                Estoy afiliado a una EPS (bono 6.75% en vez de 9%)
                            </label>
                        </>
                    )}

                    {country === "colombia" && (
                        <>
                            <div>
                                <label className="label">Salario mensual (COP)</label>
                                <input type="number" value={salarioCo} onChange={(e) => setSalarioCo(e.target.value)} placeholder="2000000" className="input-field" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Inicio del semestre</label>
                                    <input type="date" value={fechaInicioCo} onChange={(e) => setFechaInicioCo(e.target.value)} className="input-field" />
                                </div>
                                <div>
                                    <label className="label">Fin del semestre</label>
                                    <input type="date" value={fechaFinCo} onChange={(e) => setFechaFinCo(e.target.value)} className="input-field" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={auxTrans} onChange={(e) => setAuxTrans(e.target.checked)} className="rounded" />
                                Gano ≤ 2 SMLMV (tengo auxilio de transporte)
                            </label>
                        </>
                    )}

                    {country === "chile" && (
                        <>
                            <div>
                                <label className="label">Monto de aguinaldo (CLP)</label>
                                <input type="number" value={montoCl} onChange={(e) => setMontoCl(e.target.value)} placeholder="100000" className="input-field" />
                            </div>
                            <div>
                                <label className="label">Meses trabajados en el año</label>
                                <select value={mesesCl} onChange={(e) => setMesesCl(e.target.value)} className="input-field">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                    <button onClick={handleCalcular} className="btn-primary w-full">
                        Calcular
                    </button>
                </div>

                {/* ── Resultado ── */}
                {result && (
                    <div className="mt-6 rounded-2xl border border-[var(--brand-accent)]/30 bg-[#f0faf9] p-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-[var(--foreground)]">Resultado</h2>
                        <div className="mt-4 space-y-2">
                            {Object.entries(result.items as Record<string, number>).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between text-sm">
                                    <span className="text-[var(--muted)]">{key}</span>
                                    <span className="font-semibold">
                                        {typeof val === "number" && val > 100
                                            ? `${result.currency} ${val.toLocaleString("es", { minimumFractionDigits: 2 })}`
                                            : val}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t pt-4">
                            <span className="font-bold">{result.label}</span>
                            <span className="text-xl font-black text-[var(--brand-primary)]">
                                {result.currency} {(result.total as number).toLocaleString("es", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <p className="mt-3 text-xs text-[var(--muted)]">
                            * Cálculo referencial. Consulta con un profesional o con el Ministerio de Trabajo de tu país.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

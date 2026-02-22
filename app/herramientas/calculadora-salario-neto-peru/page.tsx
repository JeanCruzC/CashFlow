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

        const r = calcularSalarioNeto({
            sueldoBruto: s,
            asignacionFamiliar: asigFamiliar,
            sistemaPensiones: sistema,
            gratificaciones,
        });
        setResult(r);
    }

    return (
        <>
            <head>
                <title>{META_TITLE}</title>
                <meta name="description" content={META_DESC} />
            </head>

            <JsonLd
                id="salario-neto-calc"
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
                    💰 Calculadora de Salario Neto — Perú 2025
                </h1>
                <p className="mt-2 text-sm text-[var(--muted)]">
                    Calcula tu sueldo neto con descuentos de ONP/AFP, IR 5ta categoría, EsSalud y más.
                </p>

                {/* ── Info rápida ── */}
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-[var(--surface-tint)] p-3">
                        <p className="text-xs text-[var(--muted)]">RMV 2025</p>
                        <p className="text-sm font-bold">S/ {RMV_2025.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-tint)] p-3">
                        <p className="text-xs text-[var(--muted)]">UIT 2025</p>
                        <p className="text-sm font-bold">S/ {UIT_2025.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-tint)] p-3">
                        <p className="text-xs text-[var(--muted)]">EsSalud</p>
                        <p className="text-sm font-bold">{(ESSALUD_TASA * 100).toFixed(0)}% (empleador)</p>
                    </div>
                </div>

                {/* ── Formulario ── */}
                <div className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6">
                    <div>
                        <label className="label">Sueldo bruto mensual (S/)</label>
                        <input
                            type="number"
                            value={sueldo}
                            onChange={(e) => setSueldo(e.target.value)}
                            placeholder="3000"
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="label">Sistema de pensiones</label>
                        <select value={sistema} onChange={(e) => setSistema(e.target.value as SistemaPensiones)} className="input-field">
                            <option value="onp">ONP (13%)</option>
                            {Object.entries(AFP_DATA).map(([name, data]) => (
                                <option key={name} value={name}>
                                    AFP {name.charAt(0).toUpperCase() + name.slice(1)} ({(data.total * 100).toFixed(2)}%)
                                </option>
                            ))}
                        </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={asigFamiliar} onChange={(e) => setAsigFamiliar(e.target.checked)} className="rounded" />
                        Tengo asignación familiar (S/ 113)
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={gratificaciones} onChange={(e) => setGratificaciones(e.target.checked)} className="rounded" />
                        Incluir gratificaciones en cálculo de IR (recomendado)
                    </label>

                    {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                    <button onClick={handleCalcular} className="btn-primary w-full">
                        Calcular salario neto
                    </button>
                </div>

                {/* ── Resultado ── */}
                {result && (
                    <div className="mt-6 space-y-4 animate-fade-in-up">
                        {/* Neto */}
                        <div className="rounded-2xl border border-[var(--brand-accent)]/30 bg-[#f0faf9] p-6">
                            <h2 className="text-lg font-bold text-[var(--foreground)]">Tu salario neto mensual</h2>
                            <p className="mt-2 text-3xl font-black text-[var(--brand-primary)]">
                                S/ {result.salarioNeto.toLocaleString("es", { minimumFractionDigits: 2 })}
                            </p>

                            <div className="mt-4 space-y-2">
                                {Object.entries(result.desglose as Record<string, number>).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--muted)]">{key}</span>
                                        <span className={`font-semibold ${(val as number) < 0 ? "text-red-600" : ""}`}>
                                            S/ {(val as number).toLocaleString("es", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Detalle descuentos */}
                        <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
                            <h3 className="text-sm font-bold text-[var(--foreground)]">Detalle de descuentos</h3>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">{result.descuentoPensionesDetalle}</span>
                                    <span className="font-medium text-red-600">-S/ {result.descuentoPensiones.toLocaleString("es", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">IR 5ta Categoría (mensual)</span>
                                    <span className="font-medium text-red-600">
                                        {result.impuestoRentaMensual > 0
                                            ? `-S/ ${result.impuestoRentaMensual.toLocaleString("es", { minimumFractionDigits: 2 })}`
                                            : "Exonerado"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Costo empleador */}
                        <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
                            <h3 className="text-sm font-bold text-[var(--foreground)]">Costo del empleador (no se descuenta de tu sueldo)</h3>
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">EsSalud (9%)</span>
                                    <span className="font-medium">S/ {result.costoEmpleador.essalud.toLocaleString("es", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--muted)]">Seguro Vida Ley</span>
                                    <span className="font-medium text-[var(--muted)]">{result.costoEmpleador.seguroVidaLey}</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-[var(--muted)]">
                            * Cálculo referencial basado en tasas vigentes 2025. UIT = S/ {UIT_2025.toLocaleString()}. Consulta con SUNAT para tu caso específico.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}

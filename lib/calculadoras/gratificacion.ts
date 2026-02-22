/* ─── Calculadora de Gratificación / Prima / Aguinaldo ────────────
 *  Perú · Colombia · Chile
 * ──────────────────────────────────────────────────────────────── */

export type Country = "peru" | "colombia" | "chile";

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}



function daysBetween(a: Date, b: Date): number {
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/* ══════════════════════════════════════════════════════════════════
 *  🇵🇪  PERÚ — Gratificación (Julio + Diciembre)
 *  = Sueldo bruto × (meses en semestre / 6) + 9% bono EsSalud
 * ══════════════════════════════════════════════════════════════════ */

export interface PeruGratInput {
    sueldoBruto: number;
    asignacionFamiliar: boolean;
    mesesTrabajadosSemestre: number; // 1-6
    afiliadoEPS: boolean; // EPS → 6.75%, EsSalud → 9%
}

export interface PeruGratResult {
    gratificacionBase: number;
    bonificacionExtraordinaria: number;
    totalGratificacion: number;
}

const ASIG_FAMILIAR = 113; // 10% RMV 2025

export function calcularGratificacionPeru(input: PeruGratInput): PeruGratResult {
    const { sueldoBruto, asignacionFamiliar, mesesTrabajadosSemestre, afiliadoEPS } = input;
    const remuneracion = sueldoBruto + (asignacionFamiliar ? ASIG_FAMILIAR : 0);
    const meses = Math.min(6, Math.max(1, mesesTrabajadosSemestre));

    const gratificacionBase = round2((remuneracion / 6) * meses);
    const tasaBono = afiliadoEPS ? 0.0675 : 0.09;
    const bonificacionExtraordinaria = round2(gratificacionBase * tasaBono);
    const totalGratificacion = round2(gratificacionBase + bonificacionExtraordinaria);

    return { gratificacionBase, bonificacionExtraordinaria, totalGratificacion };
}

/* ══════════════════════════════════════════════════════════════════
 *  🇨🇴  COLOMBIA — Prima de Servicios (Junio + Diciembre)
 *  = (Salario + Aux. Transporte) × días / 360
 * ══════════════════════════════════════════════════════════════════ */

export interface ColombiaPrimaInput {
    salarioMensual: number;
    auxilioTransporte: boolean; // si gana ≤ 2 SMLMV
    fechaInicioSemestre: Date;
    fechaFinSemestre: Date;
}

export interface ColombiaPrimaResult {
    diasTrabajados: number;
    primaServicios: number;
}

const AUXILIO_TRANSPORTE = 200_000;

export function calcularPrimaColombia(input: ColombiaPrimaInput): ColombiaPrimaResult {
    const { salarioMensual, auxilioTransporte, fechaInicioSemestre, fechaFinSemestre } = input;
    const aux = auxilioTransporte ? AUXILIO_TRANSPORTE : 0;
    const base = salarioMensual + aux;
    const dias = daysBetween(fechaInicioSemestre, fechaFinSemestre);
    const primaServicios = round2((base * dias) / 360);
    return { diasTrabajados: dias, primaServicios };
}

/* ══════════════════════════════════════════════════════════════════
 *  🇨🇱  CHILE — Aguinaldo
 *  En Chile no existe un "aguinaldo legal" obligatorio equivalente.
 *  Muchas empresas lo pagan voluntariamente en septiembre y/o
 *  diciembre. El cálculo estándar es proporcional a meses del año.
 *  Para el sector público, se fija por ley cada año.
 * ══════════════════════════════════════════════════════════════════ */

export interface ChileAguinaldoInput {
    montoAguinaldo: number; // monto fijado por empresa o ley
    mesesTrabajados: number; // 1-12
}

export interface ChileAguinaldoResult {
    aguinaldoProporcional: number;
}

export function calcularAguinaldoChile(input: ChileAguinaldoInput): ChileAguinaldoResult {
    const { montoAguinaldo, mesesTrabajados } = input;
    const meses = Math.min(12, Math.max(1, mesesTrabajados));
    const aguinaldoProporcional = round2((montoAguinaldo / 12) * meses);
    return { aguinaldoProporcional };
}

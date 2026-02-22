/* ─── Calculadora de Liquidación Laboral ─────────────────────────────
 *  Perú · Colombia · Chile
 *  Toda la lógica es pura (sin side-effects), client-safe.
 * ──────────────────────────────────────────────────────────────────── */

export type Country = "peru" | "colombia" | "chile";

/* ---------- helpers ---------- */

/** Días calendario entre dos fechas */
function daysBetween(a: Date, b: Date): number {
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/** Meses completos entre dos fechas */
function fullMonths(start: Date, end: Date): number {
    const y = end.getFullYear() - start.getFullYear();
    const m = end.getMonth() - start.getMonth();
    const d = end.getDate() < start.getDate() ? -1 : 0;
    return Math.max(0, y * 12 + m + d);
}

/** Años completos + fracción ≥ 6 meses cuenta como 1 año (Chile) */
function yearsRounded(start: Date, end: Date): number {
    const months = fullMonths(start, end);
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    return remainder >= 6 ? years + 1 : years;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/* ══════════════════════════════════════════════════════════════════
 *  🇵🇪  PERÚ
 * ══════════════════════════════════════════════════════════════════ */

export interface PeruInput {
    sueldoBruto: number;
    asignacionFamiliar: boolean; // S/ 102.50 (10% RMV)
    fechaInicio: Date;
    fechaCese: Date;
}

export interface PeruResult {
    sueldoTrunco: number;
    ctsTrunca: number;
    gratificacionTrunca: number;
    vacacionesTruncas: number;
    total: number;
    desglose: Record<string, number>;
}

const ASIG_FAMILIAR_PERU = 113; // 10% de RMV S/1,130

export function calcularLiquidacionPeru(input: PeruInput): PeruResult {
    const { sueldoBruto, asignacionFamiliar, fechaInicio, fechaCese } = input;
    const remuneracion = sueldoBruto + (asignacionFamiliar ? ASIG_FAMILIAR_PERU : 0);

    // ── Sueldo trunco (días trabajados del último mes) ──
    const diasUltimoMes = fechaCese.getDate();
    const sueldoTrunco = round2((remuneracion / 30) * diasUltimoMes);

    // ── CTS Trunca ──
    // Base: remuneración + 1/6 de última gratificación
    const sextoGratificacion = remuneracion / 6;
    const baseCTS = remuneracion + sextoGratificacion;
    // Meses del semestre en curso (may-oct ó nov-abr)
    const mesCese = fechaCese.getMonth(); // 0-indexed
    const inicioSemestre = mesCese >= 4 && mesCese <= 9
        ? new Date(fechaCese.getFullYear(), 4, 1)  // mayo
        : mesCese >= 10
            ? new Date(fechaCese.getFullYear(), 10, 1)  // noviembre
            : new Date(fechaCese.getFullYear() - 1, 10, 1); // noviembre año anterior
    const mesesSemestre = Math.min(6, fullMonths(
        fechaInicio > inicioSemestre ? fechaInicio : inicioSemestre,
        fechaCese,
    ) + 1);
    const ctsTrunca = round2((baseCTS / 12) * mesesSemestre);

    // ── Gratificación trunca ──
    // Proporcional al semestre (ene-jun → julio | jul-dic → diciembre)
    const inicioSemestreGrat = mesCese >= 0 && mesCese <= 5
        ? new Date(fechaCese.getFullYear(), 0, 1)
        : new Date(fechaCese.getFullYear(), 6, 1);
    const mesesGratificacion = Math.min(6, fullMonths(
        fechaInicio > inicioSemestreGrat ? fechaInicio : inicioSemestreGrat,
        fechaCese,
    ) + 1);
    const gratBase = (remuneracion / 6) * mesesGratificacion;
    const bonoEsSalud = gratBase * 0.09;
    const gratificacionTrunca = round2(gratBase + bonoEsSalud);

    // ── Vacaciones truncas ──
    const diasTrabajados = daysBetween(fechaInicio, fechaCese);
    const vacacionesTruncas = round2((remuneracion / 360) * diasTrabajados);

    const total = round2(sueldoTrunco + ctsTrunca + gratificacionTrunca + vacacionesTruncas);

    return {
        sueldoTrunco,
        ctsTrunca,
        gratificacionTrunca,
        vacacionesTruncas,
        total,
        desglose: {
            "Sueldo trunco": sueldoTrunco,
            "CTS trunca": ctsTrunca,
            "Gratificación trunca": gratificacionTrunca,
            "Vacaciones truncas": vacacionesTruncas,
        },
    };
}

/* ══════════════════════════════════════════════════════════════════
 *  🇨🇴  COLOMBIA
 * ══════════════════════════════════════════════════════════════════ */

export interface ColombiaInput {
    salarioMensual: number;
    auxilioTransporte: boolean; // si gana ≤ 2 SMLMV
    fechaInicio: Date;
    fechaCese: Date;
}

export interface ColombiaResult {
    salarioTrunco: number;
    prima: number;
    cesantias: number;
    interesesCesantias: number;
    vacaciones: number;
    total: number;
    desglose: Record<string, number>;
}

const AUXILIO_TRANSPORTE_CO = 200_000; // 2025

export function calcularLiquidacionColombia(input: ColombiaInput): ColombiaResult {
    const { salarioMensual, auxilioTransporte, fechaInicio, fechaCese } = input;
    const auxTransporte = auxilioTransporte ? AUXILIO_TRANSPORTE_CO : 0;
    const basePrestaciones = salarioMensual + auxTransporte;
    const diasTrabajados = daysBetween(fechaInicio, fechaCese);

    // ── Salario trunco ──
    const diasUltimoMes = fechaCese.getDate();
    const salarioTrunco = round2((salarioMensual / 30) * diasUltimoMes);

    // ── Prima de servicios ──
    // (Salario + Aux) × días trabajados en semestre / 360
    const mesCese = fechaCese.getMonth();
    const inicioSemestre = mesCese <= 5
        ? new Date(fechaCese.getFullYear(), 0, 1)
        : new Date(fechaCese.getFullYear(), 6, 1);
    const diasSemestre = daysBetween(
        fechaInicio > inicioSemestre ? fechaInicio : inicioSemestre,
        fechaCese,
    );
    const prima = round2((basePrestaciones * diasSemestre) / 360);

    // ── Cesantías ──
    // (Salario + Aux) × días laborados / 360
    const cesantias = round2((basePrestaciones * diasTrabajados) / 360);

    // ── Intereses sobre cesantías (12% anual) ──
    const interesesCesantias = round2((cesantias * 0.12 * diasTrabajados) / 360);

    // ── Vacaciones ──
    // Salario base × días laborados / 720  (sin auxilio)
    const vacaciones = round2((salarioMensual * diasTrabajados) / 720);

    const total = round2(salarioTrunco + prima + cesantias + interesesCesantias + vacaciones);

    return {
        salarioTrunco,
        prima,
        cesantias,
        interesesCesantias,
        vacaciones,
        total,
        desglose: {
            "Salario trunco": salarioTrunco,
            "Prima de servicios": prima,
            "Cesantías": cesantias,
            "Intereses sobre cesantías": interesesCesantias,
            "Vacaciones": vacaciones,
        },
    };
}

/* ══════════════════════════════════════════════════════════════════
 *  🇨🇱  CHILE
 * ══════════════════════════════════════════════════════════════════ */

export type CausalChile = "necesidades_empresa" | "renuncia_voluntaria" | "mutuo_acuerdo";

export interface ChileInput {
    remuneracionImponible: number;
    fechaInicio: Date;
    fechaCese: Date;
    causal: CausalChile;
}

export interface ChileResult {
    sueldoTrunco: number;
    indemnizacionAnios: number;
    vacacionesProporcionales: number;
    total: number;
    desglose: Record<string, number>;
}

const TOPE_ANIOS_CHILE = 11;
const DIAS_VAC_POR_MES_CHILE = 1.25;

export function calcularLiquidacionChile(input: ChileInput): ChileResult {
    const { remuneracionImponible, fechaInicio, fechaCese, causal } = input;

    // ── Sueldo trunco ──
    const diasUltimoMes = fechaCese.getDate();
    const sueldoTrunco = round2((remuneracionImponible / 30) * diasUltimoMes);

    // ── Indemnización por años de servicio ──
    // Solo aplica por necesidades de la empresa (despido)
    let indemnizacionAnios = 0;
    if (causal === "necesidades_empresa") {
        const anios = Math.min(TOPE_ANIOS_CHILE, yearsRounded(fechaInicio, fechaCese));
        indemnizacionAnios = round2(remuneracionImponible * anios);
    }

    // ── Vacaciones proporcionales ──
    // 1.25 días hábiles por mes trabajado
    const meses = fullMonths(fechaInicio, fechaCese);
    const diasFraccion = fechaCese.getDate() - (fechaCese.getDate() >= fechaInicio.getDate() ? fechaInicio.getDate() : 0);
    const fraccionMes = diasFraccion / 30;
    const diasVacaciones = (meses + fraccionMes) * DIAS_VAC_POR_MES_CHILE;
    const valorDiario = remuneracionImponible / 30;
    const vacacionesProporcionales = round2(valorDiario * diasVacaciones);

    const total = round2(sueldoTrunco + indemnizacionAnios + vacacionesProporcionales);

    return {
        sueldoTrunco,
        indemnizacionAnios,
        vacacionesProporcionales,
        total,
        desglose: {
            "Sueldo trunco": sueldoTrunco,
            "Indemnización por años de servicio": indemnizacionAnios,
            "Vacaciones proporcionales": vacacionesProporcionales,
        },
    };
}

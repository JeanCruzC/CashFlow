/* ─── Calculadora de Salario Neto — Solo Perú ────────────────────
 *  Descuentos: ONP / AFP + IR 5ta Categoría
 *  Info: EsSalud (9%) y Seguro Vida Ley son costo del empleador
 * ──────────────────────────────────────────────────────────────── */

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/* ---------- constantes 2025 ---------- */

export const UIT_2025 = 5_350;
export const RMV_2025 = 1_130;
export const ASIG_FAMILIAR = 113; // 10% RMV
export const ESSALUD_TASA = 0.09; // cargo empleador
export const ONP_TASA = 0.13;

/** Tasas AFP vigentes (feb 2025 aprox.) */
export const AFP_DATA = {
    habitat: { fondo: 0.10, comision: 0.0138, prima: 0.0186, total: 0.1324 },
    integra: { fondo: 0.10, comision: 0.0140, prima: 0.0186, total: 0.1326 },
    prima: { fondo: 0.10, comision: 0.0140, prima: 0.0186, total: 0.1326 },
    profuturo: { fondo: 0.10, comision: 0.0144, prima: 0.0186, total: 0.1330 },
} as const;

export type AFPName = keyof typeof AFP_DATA;

/** Tramos del Impuesto a la Renta de 5ta Categoría */
const IR_TRAMOS: { hastaUIT: number; tasa: number }[] = [
    { hastaUIT: 5, tasa: 0.08 },
    { hastaUIT: 20, tasa: 0.14 },
    { hastaUIT: 35, tasa: 0.17 },
    { hastaUIT: 45, tasa: 0.20 },
    { hastaUIT: Infinity, tasa: 0.30 },
];

export type SistemaPensiones = "onp" | AFPName;

/* ---------- input / output ---------- */

export interface SalarioNetoInput {
    sueldoBruto: number;
    asignacionFamiliar: boolean;
    sistemaPensiones: SistemaPensiones;
    gratificaciones: boolean; // incluir gratis en cálculo anual IR
}

export interface SalarioNetoResult {
    remuneracionMensual: number;
    descuentoPensiones: number;
    descuentoPensionesDetalle: string;
    impuestoRentaMensual: number;
    salarioNeto: number;
    costoEmpleador: {
        essalud: number;
        seguroVidaLey: string;
    };
    desglose: Record<string, number>;
}

/* ---------- cálculos ---------- */

function calcularIR5ta(remuneracionMensual: number, incluyeGratificaciones: boolean): number {
    // Proyección anual: 12 meses + 2 gratificaciones (jul y dic)
    const meses = incluyeGratificaciones ? 14 : 12;
    const rentaAnualBruta = remuneracionMensual * meses;

    // Deducción de 7 UIT
    const deduccion = 7 * UIT_2025;
    const rentaAnualNeta = Math.max(0, rentaAnualBruta - deduccion);

    if (rentaAnualNeta === 0) return 0;

    // Aplicar tramos progresivos
    let impuestoAnual = 0;
    let acumulado = 0;

    for (const tramo of IR_TRAMOS) {
        const limiteTramo = tramo.hastaUIT === Infinity
            ? Infinity
            : tramo.hastaUIT * UIT_2025;
        const baseTramo = Math.min(rentaAnualNeta, limiteTramo) - acumulado;
        if (baseTramo <= 0) break;
        impuestoAnual += baseTramo * tramo.tasa;
        acumulado += baseTramo;
    }

    // Retención mensual = impuesto anual / 12
    return round2(impuestoAnual / 12);
}

export function calcularSalarioNeto(input: SalarioNetoInput): SalarioNetoResult {
    const { sueldoBruto, asignacionFamiliar, sistemaPensiones, gratificaciones } = input;
    const remuneracionMensual = sueldoBruto + (asignacionFamiliar ? ASIG_FAMILIAR : 0);

    // ── Descuento pensiones ──
    let descuentoPensiones: number;
    let descuentoPensionesDetalle: string;

    if (sistemaPensiones === "onp") {
        descuentoPensiones = round2(remuneracionMensual * ONP_TASA);
        descuentoPensionesDetalle = `ONP (${(ONP_TASA * 100).toFixed(0)}%)`;
    } else {
        const afp = AFP_DATA[sistemaPensiones];
        descuentoPensiones = round2(remuneracionMensual * afp.total);
        descuentoPensionesDetalle = `AFP ${sistemaPensiones.charAt(0).toUpperCase() + sistemaPensiones.slice(1)} (${(afp.total * 100).toFixed(2)}%)`;
    }

    // ── Impuesto a la Renta 5ta ──
    const impuestoRentaMensual = calcularIR5ta(remuneracionMensual, gratificaciones);

    // ── Salario neto ──
    const salarioNeto = round2(remuneracionMensual - descuentoPensiones - impuestoRentaMensual);

    // ── Costo empleador (informativo) ──
    const essalud = round2(remuneracionMensual * ESSALUD_TASA);

    return {
        remuneracionMensual,
        descuentoPensiones,
        descuentoPensionesDetalle,
        impuestoRentaMensual,
        salarioNeto,
        costoEmpleador: {
            essalud,
            seguroVidaLey: "Cargo del empleador (monto según póliza)",
        },
        desglose: {
            "Remuneración mensual": remuneracionMensual,
            "Descuento pensiones": -descuentoPensiones,
            "IR 5ta Categoría": -impuestoRentaMensual,
            "Salario neto": salarioNeto,
        },
    };
}

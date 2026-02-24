import { z } from "zod";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export function sanitizeSearchTerm(value: string | undefined, maxLength = 120): string {
    if (!value) return "";
    const normalized = value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .trim()
        .slice(0, maxLength);
    return normalized;
}

export function sanitizeUuid(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const normalized = value.trim();
    const parsed = uuidSchema.safeParse(normalized);
    return parsed.success ? parsed.data : undefined;
}

export function sanitizeIsoDate(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const normalized = value.trim();
    const parsed = isoDateSchema.safeParse(normalized);
    return parsed.success ? parsed.data : undefined;
}

export function clampPositiveInt(value: number, fallback: number, min = 1, max = 200): number {
    if (!Number.isFinite(value)) return fallback;
    const integer = Math.floor(value);
    if (integer < min) return fallback;
    return Math.min(integer, max);
}

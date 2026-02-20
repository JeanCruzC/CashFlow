import en from "./en.json";
import es from "./es.json";

export type Locale = "en" | "es";

const dictionaries: Record<Locale, typeof en> = { en, es };

export function getDictionary(locale: Locale) {
    return dictionaries[locale] ?? dictionaries.en;
}

export function getNestedValue(obj: Record<string, unknown>, path: string): string {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
            current = (current as Record<string, unknown>)[key];
        } else {
            return path;
        }
    }
    return typeof current === "string" ? current : path;
}

export function formatCurrency(
    value: number,
    locale: Locale,
    currency: string = "USD"
): string {
    return new Intl.NumberFormat(locale === "es" ? "es-PE" : "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

export function formatPercent(value: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === "es" ? "es-PE" : "en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value);
}

export function formatDate(date: string | Date, locale: Locale): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale === "es" ? "es-PE" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(d);
}

export function formatNumber(value: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === "es" ? "es-PE" : "en-US").format(value);
}

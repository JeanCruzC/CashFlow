export const SITE_NAME = "CashFlow";
export const SITE_TAGLINE = "Plataforma financiera interna";
export const SITE_DESCRIPTION =
  "CashFlow centraliza transacciones, cuentas, categorías, presupuesto y forecast para perfiles personales y empresariales.";
export const DEFAULT_OG_IMAGE = "/og/cashflow-cover.svg";

const FALLBACK_SITE_URL = "https://onecashflow.vercel.app";

function normalizeSiteUrl(input?: string | null): string {
  if (!input) return FALLBACK_SITE_URL;

  const withProtocol = input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`;

  try {
    const url = new URL(withProtocol);
    return url.origin.replace(/\/+$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      process.env.VERCEL_URL ??
      FALLBACK_SITE_URL,
  );
}

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export const DEFAULT_RETURN_TO = "/#seguridad";

export function sanitizeReturnTo(value: string | null | undefined, fallback: string = DEFAULT_RETURN_TO): string {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/")) {
    return fallback;
  }

  if (value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function buildRegisterHref(returnTo: string): string {
  return `/register?returnTo=${encodeURIComponent(returnTo)}`;
}

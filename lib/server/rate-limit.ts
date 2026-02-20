interface RateLimitOptions {
    key: string;
    limit: number;
    windowMs: number;
    message?: string;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function assertRateLimit({
    key,
    limit,
    windowMs,
    message = "Demasiadas solicitudes. Intenta nuevamente en unos segundos.",
}: RateLimitOptions) {
    const now = Date.now();
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return;
    }

    if (current.count >= limit) {
        throw new Error(message);
    }

    current.count += 1;
    store.set(key, current);
}

import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
}

function serialize(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const payload: LogPayload = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
    };

    return JSON.stringify(payload);
}

function shouldCaptureErrors() {
    return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function logInfo(message: string, context?: Record<string, unknown>) {
    console.log(serialize("info", message, context));
}

export function logWarn(message: string, context?: Record<string, unknown>) {
    console.warn(serialize("warn", message, context));
}

export function logError(
    message: string,
    error: unknown,
    context?: Record<string, unknown>
) {
    const errorMessage =
        error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : { message: String(error) };

    console.error(
        serialize("error", message, {
            ...context,
            error: errorMessage,
        })
    );

    if (shouldCaptureErrors()) {
        Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
            extra: context,
            tags: {
                scope: "server-action",
            },
        });
    }
}

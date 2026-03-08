"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Check, X } from "lucide-react";

interface ScheduleActionsProps {
    eventId: string;
    status: "confirmed" | "due_today" | "upcoming" | "overdue";
    ctaHref: string;
    ctaLabel: string;
    kind: "income" | "expense";
}

export function ScheduleActions({
    status,
    ctaHref,
    ctaLabel,
    kind,
}: ScheduleActionsProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (status === "confirmed") {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-positive-600">
                <Check size={14} strokeWidth={2.5} />
                Registrado
            </span>
        );
    }

    if (status === "upcoming") {
        return (
            <span className="text-xs text-surface-400">
                Sin acción requerida todavía.
            </span>
        );
    }

    /* due_today | overdue → show single action button */
    const handleRegister = () => {
        startTransition(() => {
            router.push(ctaHref);
        });
    };

    const handleSkip = () => {
        startTransition(() => {
            router.refresh();
        });
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handleRegister}
                disabled={isPending}
                className="btn-confirm"
            >
                {isPending ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                    <>
                        <ArrowRight size={13} strokeWidth={2.5} />
                        {ctaLabel}
                    </>
                )}
            </button>
            <button
                type="button"
                onClick={handleSkip}
                disabled={isPending}
                className="btn-skip"
            >
                <X size={13} strokeWidth={2} />
                No llegó
            </button>
        </div>
    );
}

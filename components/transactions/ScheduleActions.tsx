"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { dismissScheduleEvent } from "@/app/actions/schedule";

interface ScheduleActionsProps {
    eventId: string;
    status: "confirmed" | "due_today" | "upcoming" | "overdue";
    ctaHref: string;
    ctaLabel: string;
    kind: "income" | "expense";
}

export function ScheduleActions({
    eventId,
    status,
    ctaHref,
    ctaLabel,
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
                Sin acción requerida.
            </span>
        );
    }

    /* due_today | overdue → action buttons */
    const handleRegister = () => {
        startTransition(() => {
            router.push(ctaHref);
        });
    };

    const handleDismiss = () => {
        startTransition(async () => {
            await dismissScheduleEvent(eventId);
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
                onClick={handleDismiss}
                disabled={isPending}
                className="btn-skip"
            >
                <X size={13} strokeWidth={2} />
                No llegó
            </button>
        </div>
    );
}

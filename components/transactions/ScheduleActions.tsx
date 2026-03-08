"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

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
            <Link
                href="/dashboard/transactions"
                className="text-sm font-semibold text-positive-600 no-underline hover:text-positive-500 transition-colors"
            >
                ✅ Ver en registro
            </Link>
        );
    }

    const handleConfirm = () => {
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
        <div className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="btn-confirm"
            >
                {isPending ? "..." : kind === "income" ? "💰 Registrar ingreso" : "💳 Registrar pago"}
            </button>
            {(status === "overdue" || status === "due_today") && (
                <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isPending}
                    className="btn-skip"
                >
                    {isPending ? "..." : "❌ No llegó"}
                </button>
            )}
            <Link
                href={ctaHref}
                className="text-xs font-medium text-surface-500 no-underline hover:text-brand-600 transition-colors"
            >
                {ctaLabel} →
            </Link>
        </div>
    );
}

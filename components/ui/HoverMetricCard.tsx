import type { ReactNode } from "react";

interface HoverMetricDetail {
    label: string;
    value: string;
}

interface HoverMetricCardProps {
    label: string;
    value: string;
    valueClassName?: string;
    details?: HoverMetricDetail[];
    note?: string;
    footer?: ReactNode;
    tooltipSide?: "top" | "bottom";
}

export function HoverMetricCard({
    label,
    value,
    valueClassName = "text-[#0f2233]",
    details = [],
    note,
    footer,
    tooltipSide = "top",
}: HoverMetricCardProps) {
    const hasTooltipContent = details.length > 0 || Boolean(footer);
    const tooltipPositionClasses =
        tooltipSide === "bottom"
            ? "left-0 top-full mt-2"
            : "left-0 bottom-full mb-2";

    return (
        <article
            className="group relative rounded-xl border border-[#d9e2f0] bg-[#fbfdff] px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d4c7a]/30"
            tabIndex={0}
        >
            <div className="flex items-center gap-1.5">
                <p className="text-xs text-surface-500">{label}</p>
                {hasTooltipContent ? (
                    <span
                        aria-label="Información adicional"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#9fb4c9] bg-white text-[10px] font-semibold leading-none text-[#0f2233]"
                    >
                        i
                    </span>
                ) : null}
            </div>
            <p className={`mt-1 text-lg font-semibold ${valueClassName}`}>{value}</p>
            {note ? <p className="mt-1 text-[11px] text-surface-500">{note}</p> : null}

            {hasTooltipContent && (
                <div
                    className={`pointer-events-none absolute z-30 w-[min(22rem,calc(100vw-2.5rem))] max-w-[22rem] rounded-xl border border-[#d9e2f0] bg-white p-3 shadow-[0_10px_30px_rgba(15,34,51,0.14)] opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 ${tooltipPositionClasses}`}
                >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">
                        Detalle
                    </p>
                    <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1 text-xs">
                        {details.map((detail) => (
                            <div key={`${detail.label}-${detail.value}`} className="flex items-start justify-between gap-3">
                                <span className="break-words pr-2 text-surface-500">{detail.label}</span>
                                <span className="shrink-0 text-right font-semibold text-[#0f2233]">{detail.value}</span>
                            </div>
                        ))}
                    </div>
                    {footer ? (
                        <div className="mt-2 whitespace-normal break-words text-[11px] leading-relaxed text-surface-500">
                            {footer}
                        </div>
                    ) : null}
                </div>
            )}
        </article>
    );
}

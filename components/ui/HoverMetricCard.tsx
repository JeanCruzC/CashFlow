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
}

export function HoverMetricCard({
    label,
    value,
    valueClassName = "text-[#0f2233]",
    details = [],
    note,
    footer,
}: HoverMetricCardProps) {
    return (
        <article
            className="group relative rounded-xl border border-[#d9e2f0] bg-[#fbfdff] px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0d4c7a]/30"
            tabIndex={0}
        >
            <p className="text-xs text-surface-500">{label}</p>
            <p className={`mt-1 text-lg font-semibold ${valueClassName}`}>{value}</p>
            {note ? <p className="mt-1 text-[11px] text-surface-500">{note}</p> : null}

            {(details.length > 0 || footer) && (
                <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-[19rem] rounded-xl border border-[#d9e2f0] bg-white p-3 shadow-[0_10px_30px_rgba(15,34,51,0.14)] opacity-0 translate-y-1 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-500">
                        Detalle
                    </p>
                    <div className="mt-2 space-y-1.5 text-xs">
                        {details.map((detail) => (
                            <div key={`${detail.label}-${detail.value}`} className="flex items-center justify-between gap-3">
                                <span className="text-surface-500">{detail.label}</span>
                                <span className="font-semibold text-[#0f2233]">{detail.value}</span>
                            </div>
                        ))}
                    </div>
                    {footer ? <div className="mt-2 text-[11px] text-surface-500">{footer}</div> : null}
                </div>
            )}
        </article>
    );
}

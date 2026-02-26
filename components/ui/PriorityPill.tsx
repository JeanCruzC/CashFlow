import type { ReactNode } from "react";

export type PriorityLevel = "critical" | "followup" | "info";

interface PriorityPillProps {
    level: PriorityLevel;
    label?: ReactNode;
}

const toneByLevel: Record<PriorityLevel, string> = {
    critical: "border-[#dca2a2] bg-[#fff0f0] text-[#8b2c2c]",
    followup: "border-[#d9c08b] bg-[#fff8e8] text-[#7a5a18]",
    info: "border-[#a9bfdc] bg-[#eef4fc] text-[#24486f]",
};

const defaultLabelByLevel: Record<PriorityLevel, string> = {
    critical: "Critico",
    followup: "Seguimiento",
    info: "Informativo",
};

export function PriorityPill({ level, label }: PriorityPillProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${toneByLevel[level]}`}
        >
            {label ?? defaultLabelByLevel[level]}
        </span>
    );
}

"use client";

import { InfoTooltip } from "./InfoTooltip";
import { MinusIcon, TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";

interface KPICardProps {
    label: string;
    value: string;
    tooltip?: string;
    formula?: string;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    variant?: "default" | "positive" | "negative" | "warning";
    onClick?: () => void;
}

export function KPICard({
    label,
    value,
    tooltip,
    formula,
    trend,
    trendValue,
    variant = "default",
    onClick,
}: KPICardProps) {
    const trendColors = {
        up: "text-positive-500",
        down: "text-negative-500",
        neutral: "text-surface-400",
    };

    const TrendIcon = trend === "up" ? TrendUpIcon : trend === "down" ? TrendDownIcon : MinusIcon;

    const valueColors = {
        default: "text-surface-900 dark:text-surface-100",
        positive: "text-positive-600 dark:text-positive-400",
        negative: "text-negative-600 dark:text-negative-400",
        warning: "text-warning-600 dark:text-warning-400",
    };

    return (
        <div
            className={`card p-5 ${onClick ? "cursor-pointer hover:shadow-glow" : ""}`}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
        >
            <div className="flex items-start justify-between mb-3">
                {tooltip ? (
                    <InfoTooltip label={label} tooltip={tooltip} formula={formula} />
                ) : (
                    <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                        {label}
                    </span>
                )}
            </div>

            <div className="flex items-end gap-3">
                <span className={`kpi-value ${valueColors[variant]}`}>{value}</span>

                {trend && trendValue && (
                    <div className={`flex items-center gap-1 pb-0.5 ${trendColors[trend]}`}>
                        <TrendIcon size={14} />
                        <span className="text-xs font-medium">{trendValue}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

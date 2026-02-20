"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
    label: string;
    tooltip: string;
    formula?: string;
}

export function InfoTooltip({ label, tooltip, formula }: InfoTooltipProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative inline-flex items-center gap-1.5" ref={ref}>
            <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                {label}
            </span>
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full
                   bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400
                   hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:text-brand-600
                   dark:hover:text-brand-400 transition-colors duration-200 cursor-pointer"
                aria-label={`Info: ${label}`}
            >
                <Info size={10} strokeWidth={2.5} />
            </button>

            {open && (
                <div
                    className="absolute left-0 top-full mt-2 z-50 w-72 p-3 rounded-lg
                     bg-surface-0 dark:bg-surface-800 border shadow-lg
                     animate-fade-in"
                    role="tooltip"
                >
                    <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                        {tooltip}
                    </p>
                    {formula && (
                        <p className="mt-2 text-xs font-mono text-brand-600 dark:text-brand-400
                          bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded">
                            {formula}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

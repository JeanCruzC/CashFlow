import { ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectProps extends ComponentProps<"select"> {
    label?: string;
    error?: string;
    className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, children, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            "appearance-none w-full rounded-lg border bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                            error && "border-negative-500 focus:border-negative-500 focus:ring-negative-500/20",
                            className
                        )}
                        {...props}
                    >
                        {children}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                        <ChevronDown size={14} />
                    </div>
                </div>
                {error && (
                    <p className="mt-1 text-xs text-negative-500 animate-in slide-in-from-top-1">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = "Select";

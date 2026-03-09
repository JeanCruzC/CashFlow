"use client";

import { type ReactNode } from "react";

function dispatchPopup(type: string) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("showCashflowPopup", { detail: { type } }));
    }
}

export function ActionButton({ type, className, children }: { type: string; className?: string; children: ReactNode }) {
    return (
        <button className={className} onClick={() => dispatchPopup(type)}>
            {children}
        </button>
    );
}

export function ActionDiv({ type, className, children }: { type: string; className?: string; children: ReactNode }) {
    return (
        <div className={className} onClick={() => dispatchPopup(type)}>
            {children}
        </div>
    );
}

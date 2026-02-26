import type { ReactNode } from "react";

interface ModuleHeroProps {
    eyebrow: string;
    title: string;
    description: string;
    actions?: ReactNode;
    rightPanel?: ReactNode;
    children?: ReactNode;
}

export function ModuleHero({
    eyebrow,
    title,
    description,
    actions,
    rightPanel,
    children,
}: ModuleHeroProps) {
    return (
        <section className="relative rounded-3xl border border-[#d9e2f0] bg-[radial-gradient(circle_at_18%_0%,#eaf4ff_0%,#f8fbff_46%,#ffffff_100%)] p-6 shadow-card md:p-8">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,#cbe2ff_0%,rgba(203,226,255,0)_70%)]" />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,#d4f0ea_0%,rgba(212,240,234,0)_70%)]" />
            </div>

            <div
                className={`relative grid gap-6 ${
                    rightPanel ? "xl:grid-cols-[1.2fr_0.8fr]" : ""
                }`}
            >
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-surface-500">
                        {eyebrow}
                    </p>
                    <h2 className="mt-2 text-4xl font-semibold tracking-tight text-[#0f2233] md:text-5xl">
                        {title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-surface-600">{description}</p>

                    {children}

                    {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
                </div>

                {rightPanel ? (
                    <aside className="rounded-2xl border border-[#d9e2f0] bg-white/90 p-5 shadow-card backdrop-blur-sm">
                        {rightPanel}
                    </aside>
                ) : null}
            </div>
        </section>
    );
}

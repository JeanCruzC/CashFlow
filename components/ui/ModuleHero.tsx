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
        <section className="relative overflow-hidden rounded-[2rem] border border-[#d6e3f0] bg-[linear-gradient(135deg,#f3f8fd_0%,#ffffff_42%,#f8fbff_100%)] p-6 shadow-card md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#0d4c7a_0%,#117068_45%,#0a3b5e_100%)]" />
            <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,#e6edf7_0%,rgba(230,237,247,0)_70%)]" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,#e6edf7_0%,rgba(230,237,247,0)_72%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-[22%] hidden w-px bg-[linear-gradient(180deg,rgba(13,76,122,0)_0%,rgba(13,76,122,0.15)_25%,rgba(17,112,104,0.16)_100%)] xl:block" />

            <div
                className={`relative grid gap-6 ${rightPanel ? "xl:grid-cols-[1.28fr_0.72fr]" : ""
                    }`}
            >
                <div>
                    <p className="inline-flex rounded-full border border-[#d6e3f0] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0d4c7a]">
                        {eyebrow}
                    </p>
                    <h2 className="mt-4 font-display text-3xl tracking-tight text-[#10283b] md:text-5xl">
                        {title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#516067] md:text-[15px]">{description}</p>

                    {children}

                    {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
                </div>

                {rightPanel ? (
                    <aside className="rounded-[1.6rem] border border-[#d6e3f0] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(243,248,253,0.96)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_36px_rgba(16,40,59,0.08)] backdrop-blur-sm">
                        {rightPanel}
                    </aside>
                ) : null}
            </div>
        </section>
    );
}

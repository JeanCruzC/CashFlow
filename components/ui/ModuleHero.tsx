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
        <section className="relative overflow-hidden rounded-[2rem] border border-[#d3c4b1] bg-[linear-gradient(135deg,#fffaf4_0%,#ffffff_42%,#f7f1e8_100%)] p-6 shadow-card md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#1c5b6e_0%,#2d7a72_45%,#c86e2e_100%)]" />
            <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,#f4dfc8_0%,rgba(244,223,200,0)_70%)]" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,#dce7e1_0%,rgba(220,231,225,0)_72%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-[22%] hidden w-px bg-[linear-gradient(180deg,rgba(28,91,110,0)_0%,rgba(28,91,110,0.15)_25%,rgba(200,110,46,0.16)_100%)] xl:block" />

            <div
                className={`relative grid gap-6 ${
                    rightPanel ? "xl:grid-cols-[1.28fr_0.72fr]" : ""
                }`}
            >
                <div>
                    <p className="inline-flex rounded-full border border-[#dccbb2] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6a5640]">
                        {eyebrow}
                    </p>
                    <h2 className="mt-4 font-display text-3xl tracking-tight text-[#1d2732] md:text-5xl">
                        {title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#516067] md:text-[15px]">{description}</p>

                    {children}

                    {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
                </div>

                {rightPanel ? (
                    <aside className="rounded-[1.6rem] border border-[#d7c8b4] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(248,242,233,0.96)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_18px_36px_rgba(43,57,68,0.08)] backdrop-blur-sm">
                        {rightPanel}
                    </aside>
                ) : null}
            </div>
        </section>
    );
}

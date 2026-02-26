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
        <section className="relative overflow-hidden rounded-2xl border border-[#b9c7da] bg-white p-6 shadow-card md:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1b4679_0%,#2f6db1_55%,#0d7a6d_100%)]" />
            <div className="pointer-events-none absolute -right-40 -top-36 h-80 w-80 rounded-full bg-[radial-gradient(circle,#e5edf8_0%,rgba(229,237,248,0)_72%)]" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,#edf3fa_0%,rgba(237,243,250,0)_70%)]" />

            <div
                className={`relative grid gap-6 ${
                    rightPanel ? "xl:grid-cols-[1.28fr_0.72fr]" : ""
                }`}
            >
                <div>
                    <p className="inline-flex rounded-full border border-[#c5d2e3] bg-[#f3f7fc] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3a4f68]">
                        {eyebrow}
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#10233f] md:text-4xl">
                        {title}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#405067]">{description}</p>

                    {children}

                    {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
                </div>

                {rightPanel ? (
                    <aside className="rounded-xl border border-[#c5d2e3] bg-[#f4f7fb] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
                        {rightPanel}
                    </aside>
                ) : null}
            </div>
        </section>
    );
}

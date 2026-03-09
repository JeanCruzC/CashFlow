import type { ReactNode } from "react";

interface ModuleHeroProps {
    eyebrow: string;
    title: string;
    description: ReactNode;
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
        <div className="hero fu in">
            <div className="hero-line"></div>
            <div className="hero-inner">
                <div className="hero-l">
                    <div className="hero-tag">{eyebrow}</div>
                    <div className="hero-lbl">{title}</div>
                    <div className="hero-num">{children}</div>
                    <div className="hero-sub">{description}</div>
                    {actions ? <div className="hero-acts">{actions}</div> : null}
                </div>

                {rightPanel ? (
                    <div className="hero-r">
                        {rightPanel}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

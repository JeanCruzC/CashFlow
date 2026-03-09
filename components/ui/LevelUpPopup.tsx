"use client";

import { useEffect, useState } from "react";

interface LevelUpPopupProps {
    level: number;
    show: boolean;
    onClose: () => void;
}

export function LevelUpPopup({ level, show, onClose }: LevelUpPopupProps) {
    const [renderConfetti, setRenderConfetti] = useState(false);

    useEffect(() => {
        if (show) {
            setRenderConfetti(true);
            const timer = setTimeout(() => setRenderConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [show]);

    return (
        <>
            {/* OVERLAY */}
            <div id="ov" className={show ? "on" : ""} onClick={onClose} />

            {/* POPUP */}
            <div id="pop" className={show ? "on" : ""} style={{ minWidth: 340 }}>
                {/* Accent line top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--acc)] via-[#a78bfa] to-[var(--ok)] rounded-t-3xl"></div>

                <svg className="pop-ico mx-auto" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="var(--wa)" strokeWidth="1.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#ffcc5c" strokeLinejoin="round" />
                </svg>

                <div className="pop-ttl mt-4 text-3xl">¡NIVEL {level}!</div>
                <div className="pop-sub text-base mt-2">
                    Has demostrado ser un Ahorrador Inteligente. Sigue así para desbloquear nuevas recompensas.
                </div>

                <button className="pop-btn mt-4 text-lg py-3" onClick={onClose}>
                    Continuar dominando
                </button>
            </div>

            {/* BIG CONFETTI */}
            {renderConfetti && (
                <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div
                            key={i}
                            className="cf absolute top-[-20px]"
                            style={{
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 10 + 6}px`,
                                height: `${Math.random() * 10 + 6}px`,
                                backgroundColor: ['#ff4757', '#00c48c', '#6c63ff', '#ffa502'][Math.floor(Math.random() * 4)],
                                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                '--d': `${Math.random() * 1.5 + 1}s`,
                                '--dl': `${Math.random() * 0.2}s`,
                                '--x': `${(Math.random() - 0.5) * 200}px`
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
            )}
        </>
    );
}

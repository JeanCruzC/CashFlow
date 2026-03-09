"use client";

import { useEffect, useState } from "react";

export function GlobalLoader() {
    const [isVisible, setIsVisible] = useState(true);

    // You can listen to a custom event or route changes
    // For this redesign, the loader just fades out after a bit to show the impact
    // If you integrate this with real loading state, tie `isVisible` to it.
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 2800); // 2.8s aligns with the track animation in the CSS

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div id="loader" className={!isVisible ? "out" : ""}>
            <div className="ld-brand">
                <div style={{
                    width: 36, height: 36, background: 'var(--acc)', borderRadius: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px var(--acc-gl)'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#fff" />
                        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <div className="ld-dot"></div>
                CashFlow
            </div>

            <svg className="ld-pig" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="50" cy="61" rx="30" ry="27" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="2" />
                <ellipse cx="50" cy="61" rx="26" ry="23" fill="#fff" />
                <ellipse cx="50" cy="71" rx="9" ry="6" fill="#eef0f6" />
                <circle cx="46.5" cy="71" r="2" fill="#6c63ff" opacity=".55" />
                <circle cx="53.5" cy="71" r="2" fill="#6c63ff" opacity=".55" />
                <circle cx="37" cy="54" r="3" fill="#6c63ff" />
                <circle cx="63" cy="54" r="3" fill="#6c63ff" />
                <rect x="44" y="34" width="12" height="3.5" rx="1.75" fill="#ffa502" />
                <ellipse cx="21" cy="56" rx="6" ry="8" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                <ellipse cx="79" cy="56" rx="6" ry="8" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                <path d="M44 76 Q50 80 56 76" stroke="#6c63ff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <rect x="31" y="83" width="9" height="11" rx="4.5" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                <rect x="45" y="83" width="9" height="11" rx="4.5" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                <rect x="59" y="83" width="9" height="11" rx="4.5" fill="#f4f5f9" stroke="#6c63ff" strokeWidth="1.5" />
                <path d="M79 66 Q89 58 85 72" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" />
                <ellipse cx="30" cy="65" rx="5" ry="3" fill="#ff4757" opacity=".12" />
                <ellipse cx="70" cy="65" rx="5" ry="3" fill="#ff4757" opacity=".12" />
                <circle r="8" fill="#ffa502">
                    <animate attributeName="cx" values="50;50" dur=".5s" repeatCount="indefinite" />
                    <animate attributeName="cy" values="10;33;37" dur=".5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;.9;0" dur=".5s" repeatCount="indefinite" />
                </circle>
                <text x="46" y="16" fontSize="7" fill="#fff" fontWeight="bold" fontFamily="monospace">S/</text>
            </svg>

            <div className="ld-msg">Preparando tu <b>panel financiero</b>…</div>
            <div className="ld-track"><div className="ld-bar"></div></div>
            <div className="ld-tips">Consejo: quien ahorra hoy, viaja mañana</div>
        </div>
    );
}

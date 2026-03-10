"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { PetState, interactWithPet, PetActionType } from "@/app/actions/pets";

/* ═══════ CashPig LCD Tamagotchi — Side Panel ═══════
   Pixel-art LCD, SVG pig, stat bars, menu, retro buttons.
   Opens anchored to bottom-right near the floating mascot.
   ═══════════════════════════════════════════════════ */

const MENU_ITEMS = [
    { icon: "🍎", label: "COMER", action: "feed" as PetActionType },
    { icon: "💧", label: "AGUA", action: "feed" as PetActionType },
    { icon: "🎮", label: "JUGAR", action: "play" as PetActionType },
    { icon: "💊", label: "MEDICINA", action: "heal" as PetActionType },
    { icon: "🚿", label: "LIMPIAR", action: "feed" as PetActionType },
    { icon: "💤", label: "DORMIR", action: "play" as PetActionType },
];

export function TamagotchiModal({
    initialPet,
    isOpen,
    onClose,
}: {
    initialPet: PetState;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [pet, setPet] = useState<PetState>(initialPet);
    const [, startTransition] = useTransition();
    const [animClass, setAnimClass] = useState("idle");
    const [bubble, setBubble] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [selMenu, setSelMenu] = useState(0);
    const [eventFeed, setEventFeed] = useState<string[]>([]);
    const [itemPop, setItemPop] = useState<string | null>(null);
    const feedTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (pet.hunger < 20) setBubble("TENGO HAMBRE!");
        else if (pet.happiness < 20) setBubble("ESTOY TRISTE");
        else if (pet.health < 20) setBubble("ME SIENTO MAL");
        else setBubble("");
    }, [pet]);

    useEffect(() => {
        if (pet.status === "sick") setAnimClass("sick");
        else setAnimClass("idle");
    }, [pet.status]);

    const pushEvent = useCallback((txt: string) => {
        setEventFeed((prev) => [...prev.slice(-1), txt]);
        clearTimeout(feedTimer.current);
        feedTimer.current = setTimeout(() => setEventFeed([]), 3500);
    }, []);

    const popItem = (emoji: string) => {
        setItemPop(emoji);
        setTimeout(() => setItemPop(null), 700);
    };

    const handleAction = (action: PetActionType, label: string, emoji: string) => {
        setAnimClass("happy");
        popItem(emoji);
        pushEvent(`+${label}`);
        startTransition(async () => {
            const updated = await interactWithPet(action);
            if (updated) setPet(updated);
            setTimeout(() => {
                if (updated?.status === "sick") setAnimClass("sick");
                else setAnimClass("idle");
            }, 1200);
        });
    };

    const doMenuAction = (idx: number) => {
        const item = MENU_ITEMS[idx];
        setMenuOpen(false);
        handleAction(item.action, item.label, item.icon);
    };

    const navMenu = (dir: number) => {
        if (!menuOpen) { setMenuOpen(true); return; }
        setSelMenu((prev) => (prev + dir + MENU_ITEMS.length) % MENU_ITEMS.length);
    };

    // Acariciar uses 'pet' action — no hunger penalty
    const doPet = () => {
        handleAction("pet", "CARICIA", "💜");
    };

    if (!isOpen) return null;

    const barPct = (v: number) => Math.max(0, Math.min(100, v));
    const isLow = (v: number) => v < 25;
    const danger = pet.hunger < 25 || pet.happiness < 25 || pet.health < 25;

    return (
        <>
            {/* Invisible backdrop — click to close */}
            <div
                className="fixed inset-0 z-[99]"
                onClick={onClose}
                style={{ background: "transparent" }}
            />

            {/* Side panel — anchored bottom-right above the mascot */}
            <div
                className="fixed z-[100] select-none"
                style={{
                    bottom: 90,
                    right: 20,
                    animation: "slideUpIn .25s ease-out",
                }}
            >
                {/* Toast */}
                {eventFeed.length > 0 && (
                    <div
                        className="absolute -top-8 left-1/2 -translate-x-1/2 z-[200] px-3 py-1 rounded-md whitespace-nowrap"
                        style={{
                            fontSize: 7,
                            fontFamily: "'Press Start 2P', monospace",
                            color: "#f59e0b",
                            background: "#1a0a44",
                            border: "1px solid rgba(245,158,11,.4)",
                            textShadow: "0 0 8px rgba(245,158,11,.4)",
                        }}
                    >
                        {eventFeed[eventFeed.length - 1]}
                    </div>
                )}

                {/* ─── SCREEN ─── */}
                <div
                    className="relative overflow-hidden"
                    style={{
                        width: 220,
                        height: 180,
                        background: "#a8bc8a",
                        borderRadius: 10,
                        border: "3px solid #3a2a6e",
                        boxShadow:
                            "inset 0 0 24px rgba(0,30,0,.3), inset 0 2px 4px rgba(0,0,0,.15), 0 2px 0 #2a1a5e, 0 8px 32px rgba(0,0,0,.5)",
                        imageRendering: "pixelated" as const,
                        fontFamily: "'Press Start 2P', monospace",
                    }}
                >
                    {/* Scanlines */}
                    <div
                        className="absolute inset-0 pointer-events-none z-20"
                        style={{
                            backgroundImage:
                                "repeating-linear-gradient(0deg,transparent 0,transparent 1px,rgba(0,0,0,.06) 1px,rgba(0,0,0,.06) 2px)",
                        }}
                    />
                    {/* Glare */}
                    <div
                        className="absolute top-0 left-0 right-0 pointer-events-none z-[21]"
                        style={{
                            height: "40%",
                            background: "linear-gradient(180deg,rgba(255,255,255,.07),transparent)",
                            borderRadius: "8px 8px 0 0",
                        }}
                    />

                    {/* ─── STATUS ROW ─── */}
                    <div
                        className="absolute top-0 left-0 right-0 flex items-center justify-between z-10"
                        style={{
                            height: 18,
                            background: "rgba(0,20,0,.18)",
                            borderBottom: "1px solid rgba(0,50,0,.2)",
                            padding: "0 6px",
                        }}
                    >
                        <div className="flex items-center gap-1">
                            {danger && (
                                <div
                                    className="rounded-full"
                                    style={{
                                        width: 5, height: 5,
                                        background: "#253e14",
                                        animation: ".5s step-end infinite sdot",
                                    }}
                                />
                            )}
                            <span style={{ fontSize: 5, color: "#253e14", letterSpacing: ".04em" }}>
                                {pet.name || "CashPig"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {pet.status === "sick" && (
                                <span style={{ fontSize: 5, color: "#253e14" }}>★SICK</span>
                            )}
                            <span style={{ fontSize: 5, color: "#253e14" }}>PIGGY</span>
                        </div>
                    </div>

                    {/* ─── PIG STAGE ─── */}
                    <div
                        className="absolute flex items-center justify-center z-[5]"
                        style={{ top: 18, left: 0, right: 0, bottom: 34 }}
                    >
                        {/* Speech bubble */}
                        {bubble && (
                            <div
                                className="absolute z-[15]"
                                style={{
                                    top: 2, left: "50%", transform: "translateX(-50%)",
                                    background: "rgba(168,188,138,.95)",
                                    border: "1.5px solid #253e14", borderRadius: 5,
                                    padding: "3px 6px", fontSize: 6,
                                    color: "#1a2e0d", whiteSpace: "nowrap",
                                }}
                            >
                                {bubble}
                            </div>
                        )}

                        {/* Item pop */}
                        {itemPop && (
                            <div
                                className="absolute z-[15] pointer-events-none"
                                style={{
                                    bottom: 50, left: "50%", transform: "translateX(-50%)",
                                    fontSize: 15, animation: ".7s ease-out itemPop forwards",
                                }}
                            >
                                {itemPop}
                            </div>
                        )}

                        {/* Event feed */}
                        <div
                            className="absolute flex flex-col gap-0.5 pointer-events-none z-[16]"
                            style={{ top: 0, left: 0, right: 0, padding: "3px 5px" }}
                        >
                            {eventFeed.map((ev, i) => (
                                <div
                                    key={`${ev}-${i}`}
                                    style={{
                                        fontSize: 5, color: "#1a2e0d",
                                        background: "rgba(168,188,138,.88)",
                                        border: "1px solid #253e14", borderRadius: 3,
                                        padding: "2px 5px", whiteSpace: "nowrap",
                                    }}
                                >
                                    {ev}
                                </div>
                            ))}
                        </div>

                        {/* ─── THE PIG SVG ─── */}
                        <svg
                            width="74" height="74" viewBox="0 0 100 100" fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            onClick={doPet} className="cursor-pointer"
                            style={{
                                animation:
                                    animClass === "idle" ? "1.4s ease-in-out infinite pigIdle"
                                        : animClass === "happy" ? ".14s ease-in-out 6 pigHappy"
                                            : animClass === "sick" ? ".35s ease-in-out infinite pigSick"
                                                : "1.4s ease-in-out infinite pigIdle",
                                filter: animClass === "sick" ? "hue-rotate(80deg) brightness(.85)" : "none",
                            }}
                        >
                            <ellipse cx="50" cy="97" rx="20" ry="3.5" fill="rgba(0,30,0,.22)" />
                            <ellipse cx="50" cy="63" rx="30" ry="27" fill="none" stroke="#4a259e" strokeWidth="3" />
                            <ellipse cx="50" cy="63" rx="27" ry="24" fill="rgba(168,188,138,.18)" />
                            <ellipse cx="50" cy="71" rx="10" ry="7.5" fill="none" stroke="#4a259e" strokeWidth="1.8" />
                            <ellipse cx="23" cy="56" rx="6.5" ry="8.5" fill="none" stroke="#4a259e" strokeWidth="2.8" />
                            <ellipse cx="77" cy="56" rx="6.5" ry="8.5" fill="none" stroke="#4a259e" strokeWidth="2.8" />
                            <circle cx="23" cy="54" r="2" fill="#4a259e" />
                            <circle cx="77" cy="54" r="2" fill="#4a259e" />
                            <circle cx="41" cy="57" r="4" fill="none" stroke="#4a259e" strokeWidth="2.5" />
                            <circle cx="59" cy="57" r="4" fill="none" stroke="#4a259e" strokeWidth="2.5" />
                            <circle cx="41" cy="57" r="1.8" fill="#3b5bdb" />
                            <circle cx="59" cy="57" r="1.8" fill="#3b5bdb" />
                            <circle cx="42.5" cy="55.5" r=".7" fill="rgba(168,188,138,.8)" />
                            <circle cx="60.5" cy="55.5" r=".7" fill="rgba(168,188,138,.8)" />
                            <ellipse cx="50" cy="69" rx="8.5" ry="6.5" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                            <circle cx="46.5" cy="69" r="2" fill="#f59e0b" />
                            <circle cx="53.5" cy="69" r="2" fill="#f59e0b" />
                            <path
                                d={pet.status === "sick" || pet.status === "sad" ? "M44 82 Q50 78 56 82" : "M44 79 Q50 85 56 79"}
                                stroke="#4a259e" strokeWidth="2.3" fill="none" strokeLinecap="round"
                            />
                            <rect x="31" y="85" width="9.5" height="11" rx="4.8" fill="none" stroke="#4a259e" strokeWidth="2.5" />
                            <rect x="44.8" y="85" width="9.5" height="11" rx="4.8" fill="none" stroke="#4a259e" strokeWidth="2.5" />
                            <rect x="58.5" y="85" width="9.5" height="11" rx="4.8" fill="none" stroke="#4a259e" strokeWidth="2.5" />
                            <path d="M80 65 Q93 56 88 73" stroke="#4a259e" strokeWidth="2.3" fill="none" strokeLinecap="round" />
                            <rect x="43.5" y="34" width="13" height="3.8" rx="1.9" fill="#f59e0b" />
                            <ellipse cx="29" cy="68" rx="5.5" ry="3.5" fill="#4a259e" opacity=".1" />
                            <ellipse cx="71" cy="68" rx="5.5" ry="3.5" fill="#4a259e" opacity=".1" />
                        </svg>
                    </div>

                    {/* ─── STAT BARS ─── */}
                    <div
                        className="absolute bottom-0 left-0 right-0 flex items-center gap-[5px] z-10"
                        style={{
                            height: 34, background: "rgba(0,20,0,.15)",
                            borderTop: "1px solid rgba(0,50,0,.2)", padding: "0 6px",
                        }}
                    >
                        {[
                            { label: "HAMBRE", value: pet.hunger },
                            { label: "FELIZ", value: pet.happiness },
                            { label: "SALUD", value: pet.health },
                        ].map((stat) => (
                            <div key={stat.label} className="flex-1">
                                <div style={{ fontSize: 4.5, color: "#253e14", marginBottom: 2, letterSpacing: ".04em" }}>
                                    {stat.label}
                                </div>
                                <div style={{ height: 5, background: "rgba(0,30,0,.2)", border: "1px solid #253e14" }}>
                                    <div
                                        style={{
                                            height: "100%", width: `${barPct(stat.value)}%`,
                                            background: isLow(stat.value) ? "#5c2800" : "#253e14",
                                            transition: "width .6s ease",
                                            animation: isLow(stat.value) ? ".7s ease-in-out infinite lowPulse" : "none",
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ─── MENU OVERLAY ─── */}
                    {menuOpen && (
                        <div
                            className="absolute flex flex-col items-center justify-center z-[18]"
                            style={{
                                top: 18, left: 0, right: 0, bottom: 34,
                                background: "rgba(168,188,138,.97)", gap: 7, padding: 8,
                            }}
                        >
                            <div className="grid w-full" style={{ gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                                {MENU_ITEMS.map((mi, idx) => (
                                    <div
                                        key={mi.label}
                                        onClick={() => doMenuAction(idx)}
                                        className="cursor-pointer text-center"
                                        style={{
                                            background: idx === selMenu ? "#253e14" : "rgba(0,30,0,.12)",
                                            border: "1px solid #253e14",
                                            padding: "5px 4px", borderRadius: 2, transition: "all .1s",
                                        }}
                                    >
                                        <span style={{ fontSize: 11, display: "block", marginBottom: 2 }}>{mi.icon}</span>
                                        <span style={{ fontSize: 5, color: idx === selMenu ? "#a8bc8a" : "#1a2e0d", display: "block" }}>
                                            {mi.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div
                                onClick={() => setMenuOpen(false)}
                                className="cursor-pointer hover:underline"
                                style={{ fontSize: 5.5, color: "#1a2e0d", marginTop: 4 }}
                            >
                                [ CERRAR ]
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── BUTTONS ─── */}
                <div className="flex justify-center gap-[10px]" style={{ marginTop: 8 }}>
                    {[
                        { label: "◀", size: 24, fs: 7, bg: "linear-gradient(145deg,#7c4fdb,#4a259e)", shadow: "0 3px 0 #2d1060", onClick: () => navMenu(-1) },
                        { label: "☰", size: 30, fs: 9, bg: "linear-gradient(145deg,#7c4fdb,#4a259e)", shadow: "0 3px 0 #2d1060", onClick: () => setMenuOpen(!menuOpen) },
                        { label: "♥", size: 30, fs: 9, bg: "linear-gradient(145deg,#f59e0b,#d97706)", shadow: "0 3px 0 #92400e", onClick: doPet },
                        { label: "▶", size: 24, fs: 7, bg: "linear-gradient(145deg,#7c4fdb,#4a259e)", shadow: "0 3px 0 #2d1060", onClick: () => navMenu(1) },
                    ].map((btn) => (
                        <button
                            key={btn.label}
                            onClick={btn.onClick}
                            className="flex items-center justify-center border-none cursor-pointer"
                            style={{
                                width: btn.size, height: btn.size, borderRadius: "50%",
                                background: btn.bg, boxShadow: btn.shadow,
                                fontSize: btn.fs, color: "#fff",
                                fontFamily: "'Press Start 2P', monospace", transition: "all .1s",
                            }}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Close hint */}
                <div
                    className="text-center mt-1.5 cursor-pointer hover:opacity-80"
                    style={{
                        fontSize: 5, color: "rgba(255,255,255,.35)",
                        fontFamily: "'Press Start 2P', monospace", letterSpacing: ".08em",
                    }}
                    onClick={onClose}
                >
                    [ CERRAR ]
                </div>
            </div>

            {/* ─── ANIMATIONS ─── */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @keyframes pigIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes pigHappy{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)scale(1.06)}75%{transform:rotate(9deg)scale(1.06)}}
        @keyframes pigSick{0%,100%{transform:translateX(0)}50%{transform:translateX(2px)}}
        @keyframes itemPop{0%{opacity:1;transform:scale(.5)translateY(0)translateX(-50%)}60%{opacity:1;transform:scale(1.3)translateY(-14px)translateX(-50%)}100%{opacity:0;transform:scale(1)translateY(-24px)translateX(-50%)}}
        @keyframes lowPulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes sdot{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideUpIn{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}
      `}</style>
        </>
    );
}

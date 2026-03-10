"use client";

import { useState, useTransition } from "react";
import { PetState, interactWithPet } from "@/app/actions/pets";

export function TamagotchiPet({ initialPet }: { initialPet: PetState }) {
    const [pet, setPet] = useState<PetState>(initialPet);
    const [isPending, startTransition] = useTransition();
    const [animatingAction, setAnimatingAction] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = (action: 'feed' | 'play' | 'heal') => {
        setAnimatingAction(action);
        startTransition(async () => {
            const updated = await interactWithPet(action);
            if (updated) {
                setPet(updated);
            }
            setTimeout(() => setAnimatingAction(null), 1000);
        });
    };

    const getPetEmoji = () => {
        if (pet.status === 'sick') return '🤒';
        if (pet.status === 'sad') return '🥺';
        if (pet.status === 'hungry') return '🤤';

        // Happy states
        if (animatingAction === 'feed') return '😋';
        if (animatingAction === 'play') return '🥳';
        if (animatingAction === 'heal') return '😌';

        switch (pet.pet_type) {
            case 'piggy': return '🐷';
            case 'dragon': return '🐉';
            default: return '🐶';
        }
    };

    const renderWidget = () => (
        <div
            onClick={() => setIsOpen(true)}
            className="w-full text-left rounded-3xl border border-[#d9e2f0] bg-white p-4 shadow-card hover:shadow-card-hover hover:border-[#b8c5d6] transition-all duration-300 relative overflow-hidden group flex items-center justify-between cursor-pointer z-20 pointer-events-auto"
        >
            <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity duration-1000 ${pet.status === 'happy' ? 'bg-[#00cba9]/20' :
                pet.status === 'sick' ? 'bg-[#ff4757]/20' :
                    pet.status === 'hungry' ? 'bg-[#ffa502]/20' : 'bg-[#5b738b]/10'
                }`} />

            <div className="flex items-center gap-4 relative z-10 w-full">
                <div className="h-16 w-16 shrink-0 bg-[#f0f4f8] rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-[#d9e2f0] group-hover:scale-105 transition-transform duration-300">
                    {getPetEmoji()}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-black text-[#0f2233] uppercase tracking-wide">
                        {pet.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-2 w-2 rounded-full ${pet.status === 'happy' ? 'bg-[#2ed573] animate-pulse-soft' :
                            pet.status === 'sick' ? 'bg-[#ff4757]' :
                                pet.status === 'hungry' ? 'bg-[#ffa502]' : 'bg-[#5b738b]'
                            }`} />
                        <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-widest">
                            {pet.status === 'happy' ? 'Feliz' :
                                pet.status === 'sick' ? 'Enfermizo' :
                                    pet.status === 'hungry' ? 'Hambriento' : 'Triste'}
                        </span>
                    </div>
                </div>
                <div className="shrink-0 px-3 py-1.5 rounded-full bg-surface-100 text-[#0f2233] text-xs font-bold uppercase tracking-wider group-hover:bg-[#1d4ed8] group-hover:text-white transition-colors">
                    Ver Mascota
                </div>
            </div>
        </div>
    );

    // Retro Virtual Tamagotchi View
    const renderModal = () => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop Click */}
                <button
                    className="absolute inset-0 bg-[#0f2233]/60 backdrop-blur-sm cursor-default"
                    onClick={() => setIsOpen(false)}
                    aria-label="Cerrar Mascota"
                ></button>

                {/* Virtual Device Shell */}
                <div className="relative z-10 w-full max-w-sm animate-fade-in" style={{ filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.4))' }}>

                    {/* Device Outer Plastic */}
                    <div className="relative bg-gradient-to-br from-[#1ea2e9] to-[#0f71aa] rounded-[4.5rem] p-6 pb-12 border-[6px] border-[#0c5b8a] shadow-[inset_-6px_-6px_15px_rgba(0,0,0,0.2),inset_6px_6px_15px_rgba(255,255,255,0.3)] aspect-[3/4.2] flex flex-col items-center">

                        {/* Close button top right */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-6 right-8 text-white/50 hover:text-white text-sm font-black uppercase tracking-widest transition-colors z-20 outline-none"
                        >
                            X
                        </button>

                        {/* Top Branding/Detail */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white/50 uppercase tracking-[0.3em] font-black text-xs text-center select-none">
                            CashFlow
                            <div className="text-[8px] tracking-[0.5em] mt-1 opacity-70">PET</div>
                        </div>

                        {/* Speaker holes */}
                        <div className="absolute top-10 left-8 flex gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0c5b8a]/60 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0c5b8a]/60 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]"></div>
                        </div>

                        {/* Screen Bezel */}
                        <div className="w-full bg-[#e1e9f0] rounded-[2rem] p-3 shadow-[inset_0_4px_10px_rgba(0,0,0,0.2),0_2px_0_rgba(255,255,255,0.2)] mt-12">

                            {/* Inner LCD Screen */}
                            <div className="w-full aspect-square bg-[#9cad85] rounded-xl flex flex-col relative overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] border-2 border-[#8a9a72] p-3">

                                {/* LCD Overlay texture effect */}
                                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '3px 3px' }} />

                                {/* Screen Header Stats */}
                                <div className="flex justify-between items-start z-10 select-none">
                                    <div className="flex flex-col gap-[3px] w-[50%]">
                                        <div className="flex items-center">
                                            <span className="text-[#3b4433] text-[8px] font-black uppercase w-8">HMBR</span>
                                            <div className="flex-1 flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className={`h-1.5 flex-1 border border-[#3b4433]/40 ${pet.hunger > i * 20 ? 'bg-[#3b4433]' : 'bg-transparent'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-[#3b4433] text-[8px] font-black uppercase w-8">FELI</span>
                                            <div className="flex-1 flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className={`h-1.5 flex-1 border border-[#3b4433]/40 ${pet.happiness > i * 20 ? 'bg-[#3b4433]' : 'bg-transparent'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-[#3b4433] text-[8px] font-black uppercase mb-[1px]">SALUD</div>
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`h-2.5 w-1.5 border border-[#3b4433]/40 ${pet.health > i * 20 ? 'bg-[#3b4433]' : 'bg-transparent'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Pet Area */}
                                <div className="flex-1 flex items-center justify-center relative mt-2 select-none">
                                    {/* Floor shadow */}
                                    <div className="absolute bottom-[10%] w-20 h-4 bg-[#3b4433]/20 rounded-[100%] blur-[2px]" />

                                    <span className={`text-[5.5rem] drop-shadow-sm z-10 transition-transform duration-300 origin-bottom ${animatingAction === 'play' ? 'animate-[bounce_0.5s_infinite]' :
                                        animatingAction === 'feed' ? 'scale-110' :
                                            pet.status === 'happy' ? 'animate-[pulse_2s_infinite]' : ''
                                        }`}>
                                        {getPetEmoji()}
                                    </span>

                                    {/* Action Particles on LCD */}
                                    {animatingAction === 'play' && <span className="absolute top-4 right-8 text-3xl font-black text-[#3b4433] animate-pulse">*</span>}
                                    {animatingAction === 'feed' && <span className="absolute top-6 left-4 text-2xl font-black text-[#3b4433] animate-bounce">O</span>}
                                    {animatingAction === 'heal' && <span className="absolute top-4 left-6 text-2xl font-black text-[#3b4433] animate-pulse">+</span>}
                                </div>

                                {/* Status indicators at bottom of LCD */}
                                <div className="absolute bottom-1.5 w-full left-0 px-3 flex justify-between items-center select-none">
                                    <div className="text-[8px] font-black text-[#3b4433]/70 uppercase">
                                        {pet.name}
                                    </div>

                                    {(pet.hunger < 30 || pet.health < 30 || pet.happiness < 30) && (
                                        <div className="flex items-center gap-1 animate-pulse">
                                            <div className="h-2.5 w-2.5 rounded-full bg-[#3b4433] flex items-center justify-center text-[#9cad85] text-[7px] font-black pt-[1px]">!</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Physical Buttons Area */}
                        <div className="flex justify-center gap-8 mt-12 w-full px-4 select-none">
                            {/* Feed Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    className={`h-12 w-12 rounded-full bg-[#f1c40f] border-2 border-[#b99505] shadow-[0_6px_0_#b99505,inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none 
                                    transition-all duration-75 active:shadow-[0_0px_0_#b99505,inset_0_2px_4px_rgba(255,255,255,0.3)] active:translate-y-[6px] 
                                    flex items-center justify-center group disabled:opacity-70 disabled:filter-grayscale`}
                                    onClick={() => handleAction('feed')}
                                    disabled={isPending || pet.hunger >= 100}
                                >
                                    <span className="opacity-70 group-hover:opacity-100 transition-opacity text-xs font-black text-[#b99505]">A</span>
                                </button>
                                <span className="text-white/90 font-black text-[9px] uppercase mt-3tracking-wider [text-shadow:0_1px_1px_rgba(0,0,0,0.5)] mt-3">Alimento</span>
                            </div>

                            {/* Play Button - Lower down like real Tamagotchi */}
                            <div className="flex flex-col items-center relative top-5">
                                <button
                                    className={`h-12 w-12 rounded-full bg-[#e74c3c] border-2 border-[#b32f22] shadow-[0_6px_0_#b32f22,inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none 
                                    transition-all duration-75 active:shadow-[0_0px_0_#b32f22,inset_0_2px_4px_rgba(255,255,255,0.3)] active:translate-y-[6px] 
                                    flex items-center justify-center group disabled:opacity-70 disabled:filter-grayscale`}
                                    onClick={() => handleAction('play')}
                                    disabled={isPending || pet.happiness >= 100}
                                >
                                    <span className="opacity-70 group-hover:opacity-100 transition-opacity text-xs font-black text-[#b32f22]">B</span>
                                </button>
                                <span className="text-white/90 font-black text-[9px] uppercase mt-3 tracking-wider [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">Juego</span>
                            </div>

                            {/* Heal Button */}
                            <div className="flex flex-col items-center">
                                <button
                                    className={`h-12 w-12 rounded-full bg-[#2ecc71] border-2 border-[#1c924e] shadow-[0_6px_0_#1c924e,inset_0_2px_4px_rgba(255,255,255,0.6)] outline-none 
                                    transition-all duration-75 active:shadow-[0_0px_0_#1c924e,inset_0_2px_4px_rgba(255,255,255,0.3)] active:translate-y-[6px] 
                                    flex items-center justify-center group disabled:opacity-70 disabled:filter-grayscale`}
                                    onClick={() => handleAction('heal')}
                                    disabled={isPending || pet.health >= 100}
                                >
                                    <span className="opacity-70 group-hover:opacity-100 transition-opacity text-xs font-black text-[#1c924e]">C</span>
                                </button>
                                <span className="text-white/90 font-black text-[9px] uppercase mt-3 tracking-wider [text-shadow:0_1px_1px_rgba(0,0,0,0.5)]">Curar</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderWidget()}
            {renderModal()}
        </>
    );
}

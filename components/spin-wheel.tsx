"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Gift, Sparkles, RefreshCcw, X, AlertCircle, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rtdb } from "@/lib/firebase";
import { ref, set, increment, onValue } from "firebase/database";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Prize {
    id: string;
    text: string;
    color: string;
    value: any;
    type: string;
}

interface SpinWheelProps {
    restaurantId: string;
    logoUrl?: string;
    limit: number; // Daily total winners limit
    maxAttempts?: number; // Attempts per user
    onClose?: () => void;
    prizes?: Prize[];
    primaryColor?: string;
    winEveryX?: number;
}

const DEFAULT_PRIZES: Prize[] = [
    { id: "1", text: "10% Chegirma", color: "#C75B39", value: 10, type: 'discount' },
    { id: "2", text: "Omad kelsin!", color: "#2C2C2C", value: 0, type: 'none' },
    { id: "3", text: "20% Chegirma", color: "#D4956A", value: 20, type: 'discount' },
    { id: "4", text: "Keyingi safar!", color: "#3D3D3D", value: 0, type: 'none' },
    { id: "5", text: "30% Chegirma", color: "#8B4513", value: 30, type: 'discount' },
    { id: "6", text: "Omad kelsin!", color: "#4A4A4A", value: 0, type: 'none' },
];

export function SpinWheel({
    restaurantId,
    logoUrl,
    limit,
    maxAttempts = 3,
    onClose,
    prizes = DEFAULT_PRIZES,
    primaryColor = "#8B4513",
    winEveryX = 10
}: SpinWheelProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<Prize | null>(null);
    const [canSpin, setCanSpin] = useState(true);
    const [attempts, setAttempts] = useState(0);
    const [winsToday, setWinsToday] = useState(0);
    const [prizeCode, setPrizeCode] = useState<string | null>(null);
    const [totalSpins, setTotalSpins] = useState(0);
    const { toast } = useToast();

    const activePrizes = prizes?.length > 0 ? prizes : DEFAULT_PRIZES;

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const userSpinKey = `spin_attempts_${restaurantId}_${today}`;
        const userPrizeKey = `spin_prize_${restaurantId}_${today}`;

        // Check already won
        const savedPrize = localStorage.getItem(userPrizeKey);
        if (savedPrize) {
            const parsed = JSON.parse(savedPrize);
            setResult(activePrizes.find(p => p.text === parsed.prize) || { text: parsed.prize } as Prize);
            setPrizeCode(parsed.code);
            setCanSpin(false);
        }

        // Check attempts
        const savedAttempts = parseInt(localStorage.getItem(userSpinKey) || "0");
        setAttempts(savedAttempts);

        // Real-time wins & Total spins
        const winsRef = ref(rtdb, `restaurants/${restaurantId}/spin_stats/${today}`);
        const totalSpinsRef = ref(rtdb, `restaurants/${restaurantId}/spin_stats/total_spins`);

        const unsubWins = onValue(winsRef, (snapshot) => {
            setWinsToday(snapshot.val() || 0);
        });

        const unsubTotal = onValue(totalSpinsRef, (snapshot) => {
            setTotalSpins(snapshot.val() || 0);
        });

        return () => {
            unsubWins();
            unsubTotal();
        };
    }, [restaurantId, activePrizes]);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const userPrizeKey = `spin_prize_${restaurantId}_${today}`;
        const alreadyWon = localStorage.getItem(userPrizeKey);

        if (alreadyWon || winsToday >= limit || attempts >= maxAttempts) {
            setCanSpin(false);
        } else {
            setCanSpin(true);
        }
    }, [winsToday, limit, attempts, restaurantId]);

    const spin = async () => {
        if (isSpinning || !canSpin) return;
        setIsSpinning(true);

        const today = new Date().toISOString().split('T')[0];

        // 1. Increment total spins immediately to claim this "slot"
        const totalSpinsRef = ref(rtdb, `restaurants/${restaurantId}/spin_stats/total_spins`);
        const currentTotal = totalSpins + 1;
        await set(totalSpinsRef, increment(1));

        // 2. Logic to determine if this is a winning spin
        // A win happens if:
        // - We haven't reached daily win limit
        // - AND (Current spin is exactly the Xth spin OR we haven't had a win in a long time)
        const isWinStep = winEveryX > 0 && currentTotal % (winEveryX || 10) === 0;
        const isWinAllowed = winsToday < limit;
        const shouldWin = isWinStep && isWinAllowed;

        const winners = activePrizes.filter(p => p.type !== 'none');
        const losers = activePrizes.filter(p => p.type === 'none');

        let targetPrize;
        if (shouldWin && winners.length > 0) {
            targetPrize = winners[Math.floor(Math.random() * winners.length)];
        } else if (losers.length > 0) {
            targetPrize = losers[Math.floor(Math.random() * losers.length)];
        } else {
            // Fallback
            targetPrize = activePrizes[Math.floor(Math.random() * activePrizes.length)];
        }

        const prizeIndex = activePrizes.indexOf(targetPrize);
        const segmentAngle = 360 / activePrizes.length;
        const targetAngle = (prizeIndex * segmentAngle) + (segmentAngle / 2);

        const currentRemainder = rotation % 360;
        const desiredRemainder = (360 - targetAngle) % 360;
        let extraDegrees = desiredRemainder - currentRemainder;
        if (extraDegrees <= 0) extraDegrees += 360;

        const newRotation = rotation + (360 * 10) + extraDegrees;
        setRotation(newRotation);

        setTimeout(async () => {
            setIsSpinning(false);
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            localStorage.setItem(`spin_attempts_${restaurantId}_${today}`, newAttempts.toString());

            if (targetPrize.type !== 'none' && winsToday < limit) {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                setPrizeCode(code);
                setResult(targetPrize);

                try {
                    const winsRef = ref(rtdb, `restaurants/${restaurantId}/spin_stats/${today}`);
                    await set(winsRef, increment(1));
                    localStorage.setItem(`spin_prize_${restaurantId}_${today}`, JSON.stringify({
                        prize: targetPrize.text,
                        timestamp: Date.now(),
                        code: code
                    }));
                } catch (e) { console.error(e); }
            } else {
                setResult(targetPrize);
            }
        }, 4000);
    };

    const wheelBackground = activePrizes.map((p, i) => {
        const angle = 360 / activePrizes.length;
        return `${p.color} ${i * angle}deg ${(i + 1) * angle}deg`;
    }).join(', ');

    return (
        <div
            className="w-full max-w-[380px] mx-auto p-6 sm:p-10 rounded-[48px] bg-black/50 backdrop-blur-[40px] border border-white/20 shadow-[0_40px_80px_rgba(0,0,0,0.6)] relative overflow-hidden group/modal transition-all duration-500"
            style={{ '--primary-color': primaryColor } as React.CSSProperties}
        >
            {/* Background Aesthetic Blur Rings */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] blur-[120px] rounded-full pointer-events-none opacity-30" style={{ backgroundColor: primaryColor }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] blur-[120px] rounded-full pointer-events-none opacity-30" style={{ backgroundColor: primaryColor }} />

            {onClose && (
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                    className="absolute top-6 right-6 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-[110] border border-white/10 backdrop-blur-xl"
                >
                    <X className="w-5 h-5" />
                </motion.button>
            )}

            <div className="text-center space-y-3 mb-10 relative z-10">
                <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white leading-[0.9] drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                    7days  <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/30">burger</span>
                </h2>
                <div className="flex justify-center items-center gap-2 pt-4">
                    <div className="px-5 py-2 bg-white/5 border border-white/10 text-white/40 text-[10px] font-black rounded-full backdrop-blur-2xl uppercase tracking-[0.2em] shadow-inner">
                        Urinish: <span className="text-white ml-1">{Math.max(0, maxAttempts - attempts)} / {maxAttempts}</span>
                    </div>
                </div>
            </div>

            <div className="relative mb-12 flex justify-center items-center perspective-[1000px]">
                <div className="absolute w-[315px] h-[315px] sm:w-[345px] sm:h-[345px] rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] z-0 ring-1 ring-white/5" />

                {[...Array(36)].map((_, i) => (
                    <div key={i} className="absolute w-[1px] h-3 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ transform: `rotate(${i * 10}deg) translateY(-148px)`, backgroundColor: i % 9 === 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)' }}
                    />
                ))}

                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40">
                    <div className="w-10 h-14 bg-white/10 backdrop-blur-[30px] border border-white/30 rounded-full flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute opacity-20" />
                        <div className="w-3.5 h-3.5 bg-red-600 rounded-full shadow-[0_0_20px_#dc2626] border-2 border-white/20 relative z-10" />
                    </div>
                </div>

                <div className="relative z-10 p-2.5 rounded-full border border-white/20 bg-black/30 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <motion.div animate={{ rotate: rotation }} transition={{ duration: 4, ease: [0.15, 0, 0.15, 1] }}
                        className="w-[270px] h-[270px] sm:w-[300px] sm:h-[300px] rounded-full relative overflow-hidden border border-white/10 shadow-inner"
                        style={{ background: `conic-gradient(${wheelBackground})` }}
                    >
                        {activePrizes.map((prize, i) => {
                            const angle = 360 / activePrizes.length;
                            return (
                                <div key={prize.id} className="absolute top-0 left-1/2 h-1/2 w-[1.5px] bg-white/10 origin-bottom"
                                    style={{ transform: `translateX(-50%) rotate(${i * angle + angle / 2}deg)` }}
                                >
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 pt-6 text-[11px] font-black text-white uppercase tracking-tighter rotate-180 drop-shadow-xl"
                                        style={{ writingMode: 'vertical-rl' }}
                                    >
                                        <span className="opacity-90">{prize.text}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-transparent to-transparent pointer-events-none rounded-full" />
                    </motion.div>

                    <div className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-white/5 backdrop-blur-[50px] shadow-[0_15px_30px_rgba(0,0,0,0.4)] z-20 overflow-hidden flex items-center justify-center p-2.5 border border-white/30">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center relative overflow-hidden p-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]">
                            {logoUrl ? (
                                <Image src={logoUrl} alt="Logo" width={60} height={60} className="object-contain" priority />
                            ) : (
                                <Sparkles className="w-10 h-10 text-black/80" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6 relative z-10 px-2 sm:px-4">
                <AnimatePresence mode="wait">
                    {result ? (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative"
                        >
                            {result.type !== 'none' ? (
                                <div className="p-8 rounded-[40px] bg-white/10 backdrop-blur-3xl border border-white/20 shadow-[0_24px_48px_rgba(0,0,0,0.4)] text-center relative overflow-hidden">
                                    {/* Confetti Particles */}
                                    {[...Array(12)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ top: "50%", left: "50%", scale: 0 }}
                                            animate={{
                                                top: `${Math.random() * 100}%`,
                                                left: `${Math.random() * 100}%`,
                                                scale: [0, 1, 0],
                                                rotate: [0, 180, 360]
                                            }}
                                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                                            className="absolute w-2 h-2 rounded-sm"
                                            style={{ backgroundColor: ['#FFD700', '#FF6B6B', '#4D96FF', '#6BCB77'][i % 4] }}
                                        />
                                    ))}

                                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}
                                        className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-[28px] flex items-center justify-center mx-auto text-white shadow-lg mb-6 ring-4 ring-white/10"
                                    >
                                        {result.type === 'item' ? <Utensils className="w-10 h-10" /> : <Trophy className="w-10 h-10" />}
                                    </motion.div>
                                    <h3 className="font-black text-3xl text-white uppercase tracking-tight mb-2">TABRIKLAYMIZ!</h3>
                                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">
                                        {result.type === 'item' ? "Siz sovg'aga taom yutdingiz!" : "Siz chegirma yutdingiz!"}
                                    </p>
                                    <div className="py-5 px-10 bg-white text-black rounded-3xl font-black text-3xl shadow-2xl inline-block mb-8 tracking-tighter">
                                        {result.text}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 rounded-[40px] bg-white/5 backdrop-blur-3xl border border-white/10 text-center space-y-6">
                                    <div className="w-20 h-20 bg-white/10 rounded-[28px] flex items-center justify-center mx-auto text-white/40 shadow-inner mb-2">
                                        <RefreshCcw className="w-10 h-10 opacity-20" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-black text-2xl text-white uppercase tracking-tight italic opacity-60">Xafa bo'lmang!</h3>
                                        <p className="text-sm font-bold text-white/40 uppercase tracking-widest px-4">
                                            {result.text}
                                        </p>
                                    </div>
                                    {canSpin && (
                                        <Button
                                            onClick={() => setResult(null)}
                                            className="w-full h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest border border-white/10"
                                        >
                                            Yana urinib ko'rish
                                        </Button>
                                    )}
                                    {!canSpin && (
                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                                                Ertaga yana urinib ko'ring 👋
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div key="action" className="space-y-4">
                            <Button onClick={spin} disabled={isSpinning || !canSpin}
                                className={cn(
                                    "w-full h-24 rounded-[36px] text-2xl font-black shadow-2xl transition-all active:scale-[0.94] group relative overflow-hidden border border-white/20 active:shadow-inner",
                                    canSpin ? "text-white hover:opacity-95" : "bg-white/5 text-white/20 cursor-not-allowed border-white/5"
                                )}
                                style={{ backgroundColor: canSpin ? primaryColor : undefined, boxShadow: canSpin ? `0 20px 40px ${primaryColor}44` : 'none' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 opacity-50" />
                                {isSpinning ? (
                                    <RefreshCcw className="w-10 h-10 animate-spin" />
                                ) : (
                                    <div className="flex items-center justify-center gap-4 relative z-10 transition-transform group-hover:scale-105">
                                        <Gift className={cn("w-8 h-8", canSpin && "animate-bounce")} />
                                        <span className="tracking-tighter uppercase">{canSpin ? "Chegirma olish" : "Urinishlar tugadi"}</span>
                                    </div>
                                )}
                                {canSpin && <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:animate-shine transition-none pointer-events-none" />}
                            </Button>

                            {!canSpin && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="p-5 rounded-[32px] bg-white/5 border border-white/10 text-center backdrop-blur-md"
                                >
                                    <div className="flex items-center justify-center gap-2 text-white/40">
                                        <AlertCircle className="w-4 h-4" />
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em]">
                                            {winsToday >= limit ? "Sovg'alar tugadi" : "Bugungi urinishlar tugadi"}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style jsx>{`
                @keyframes shine { from { transform: translateX(-100%) skewX(-12deg); } to { transform: translateX(200%) skewX(-12deg); } }
                .animate-shine { animation: shine 2.5s infinite; }
            `}</style>
        </div>
    );
}

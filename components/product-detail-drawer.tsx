"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
    Loader2, Minus, Plus, RotateCcw, Edit, Trash2, Scale,
    Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    Box, ShoppingCart
} from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PriceDisplay } from "@/components/price-display";
import { DiscountTimer } from "@/components/discount-timer";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedName, getLocalizedDescription } from "@/lib/localization";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { optimizeImage } from "@/lib/image-optimizer";
import type { MenuItem } from "@/types";
import { rtdb } from "@/lib/firebase";
import { ref, push, serverTimestamp } from "firebase/database";
import { useAuth } from "@/components/admin/admin-auth-provider";

interface ProductDetailDrawerProps {
    item: MenuItem | null;
    isOpen: boolean;
    onClose: () => void;
    onNext: () => void;
    onPrev: () => void;
    isAdmin?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    primaryColor?: string;
    restaurantId?: string;
    isOrderingEnabled?: boolean;
    isTelegramOrderOnly?: boolean;
    isTelegramWebApp?: boolean;
    onOrderTelegram?: () => void;
}

export function ProductDetailDrawer({
    item,
    isOpen,
    onClose,
    onNext,
    onPrev,
    isAdmin = false,
    onEdit,
    onDelete,
    primaryColor = "#000",
    restaurantId: propRestId,
    isOrderingEnabled = true,
    isTelegramOrderOnly = false,
    isTelegramWebApp = false,
    onOrderTelegram,
}: ProductDetailDrawerProps) {
    const { t, language } = useLanguage();

    // Image state
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [modalImageLoading, setModalImageLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

    const { addToCart, getItemQuantity, updateItemQuantity } = useCart();

    // Gesture refs
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const prevDistRef = useRef<number | null>(null);
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);

    const router = useRouter();
    const { restaurantId: authRestId } = useAuth();
    const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("analytics_session_id") : null;

    // Reset on open/item change & Track View
    useEffect(() => {
        if (isOpen && item) {
            setZoomLevel(1);
            setPan({ x: 0, y: 0 });
            setModalImageLoading(true);
            setCurrentImageIndex(0);
            setSelectedVariantId(item.variants?.[0]?.id || null);

            // Track Dish View
            if (sessionId && !isAdmin) {
                try {
                    const today = new Date().toISOString().split('T')[0];

                    // Global session task
                    const globalPageRef = ref(rtdb, `analytics/sessions/${today}/${sessionId}/pages`);
                    push(globalPageRef, {
                        path: `dish:${item.id}`,
                        title: item.name_uz || item.name,
                        timestamp: serverTimestamp()
                    }).catch((e) => console.warn("Analytics write skipped:", e));

                    // Restaurant specific session task if available
                    const targetRestId = propRestId || authRestId;
                    if (targetRestId) {
                        const restPageRef = ref(rtdb, `analytics/restaurants/${targetRestId}/sessions/${today}/${sessionId}/pages`);
                        push(restPageRef, {
                            path: `dish:${item.id}`,
                            title: item.name_uz || item.name,
                            timestamp: serverTimestamp()
                        }).catch((e) => console.warn("Analytics write skipped:", e));
                    }
                } catch (e) {
                    console.error("Tracking error:", e);
                }
            }
        }
    }, [item?.id, isOpen, sessionId, isAdmin, authRestId]);

    const handleModalImageLoad = useCallback(() => {
        setModalImageLoading(false);
    }, []);

    /* ── Pointer gesture handlers ── */
    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointersRef.current.size === 1) {
            isDraggingRef.current = true;
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
        if (pointersRef.current.size === 2) {
            const pts = Array.from(pointersRef.current.values());
            prevDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (pointersRef.current.has(e.pointerId)) {
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        // Pinch zoom
        if (pointersRef.current.size === 2 && prevDistRef.current !== null) {
            const pts = Array.from(pointersRef.current.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (dist > 0) {
                const factor = dist / prevDistRef.current;
                setZoomLevel(prev => Math.min(Math.max(0.5, prev * factor), 5));
                prevDistRef.current = dist;
            }
            return;
        }
        // Pan (only when zoomed)
        if (isDraggingRef.current && pointersRef.current.size === 1 && zoomLevel > 1) {
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        pointersRef.current.delete(e.pointerId);
        e.currentTarget.releasePointerCapture(e.pointerId);

        // Swipe to change image (only at zoom=1)
        if (isDraggingRef.current && pointersRef.current.size === 0 && zoomLevel === 1) {
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            if (Math.abs(dx) > 40 && Math.abs(dy) < 100) {
                const count = item?.imageUrls?.length || 1;
                if (dx > 0) {
                    currentImageIndex > 0
                        ? (setCurrentImageIndex(p => p - 1), setModalImageLoading(true))
                        : onPrev();
                } else {
                    currentImageIndex < count - 1
                        ? (setCurrentImageIndex(p => p + 1), setModalImageLoading(true))
                        : onNext();
                }
            }
        }

        if (pointersRef.current.size < 2) prevDistRef.current = null;
        if (pointersRef.current.size === 0) { isDraggingRef.current = false; }
        if (pointersRef.current.size === 1) {
            const rem = pointersRef.current.values().next().value;
            setDragStart({ x: rem.x - pan.x, y: rem.y - pan.y });
            dragStartRef.current = { x: rem.x, y: rem.y };
        }
    };

    /* ── Save / download image ── */
    const handleSaveImage = async () => {
        if (!item || isSaving) return;
        setIsSaving(true);
        try {
            const src = (item.imageUrls && item.imageUrls.length > 0)
                ? item.imageUrls[currentImageIndex]
                : item.imageUrl!;
            const res = await fetch(src);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${getLocalizedName(item, language)}.jpg`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // fallback: open in new tab
            const src = (item.imageUrls && item.imageUrls.length > 0)
                ? item.imageUrls[currentImageIndex]
                : item.imageUrl!;
            window.open(src, "_blank");
        } finally {
            setIsSaving(false);
        }
    };

    if (!item) return null;

    const currentPrice = item.price;
    const imageSrc = optimizeImage(
        (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[currentImageIndex] : item.imageUrl!,
        1200
    );
    const hasMultipleImages = item.imageUrls && item.imageUrls.length > 1;

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
            <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] border-0 flex flex-col overflow-hidden outline-none bg-transparent">
                <DrawerTitle className="sr-only">{getLocalizedName(item, language)}</DrawerTitle>

                {/* ══ FULL-SCREEN BLURRED BACKGROUND ══ */}
                <div className="absolute inset-0 z-0 overflow-hidden rounded-t-[30px]">
                    {/* blurred bg image — light/white */}
                    <div
                        className="absolute inset-0 scale-110"
                        style={{
                            backgroundImage: `url(${imageSrc})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            filter: "blur(32px) brightness(1.6) saturate(0.5)",
                        }}
                    />
                    {/* white overlay */}
                    <div className="absolute inset-0 bg-white/70" />
                </div>

                {/* ══ FLOATING TOP CONTROLS ══ */}
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-black/10 text-gray-800 backdrop-blur-md border border-black/10 transition-transform active:scale-90 hover:bg-black/15"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                </button>

                {/* Save image */}
                <button
                    onClick={handleSaveImage}
                    disabled={isSaving}
                    className="absolute top-4 right-16 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-black/10 text-gray-800 backdrop-blur-md border border-black/10 transition-transform active:scale-90 hover:bg-black/15 disabled:opacity-50"
                    title="Rasmni saqlash"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </button>

                {/* Admin actions */}
                {isAdmin && (
                    <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
                        <Button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                            size="icon"
                            className="h-10 w-10 rounded-full bg-black/10 text-gray-800 backdrop-blur-md hover:bg-black/15 border border-black/10"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                            size="icon"
                            variant="destructive"
                            className="h-10 w-10 rounded-full"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* ══ IMAGE AREA (zoomable, swipeable) ══ */}
                <div
                    className="relative z-10 w-full flex-shrink-0 overflow-hidden"
                    style={{ height: "52vh" }}
                    onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e); }}
                    onPointerMove={(e) => { e.stopPropagation(); handlePointerMove(e); }}
                    onPointerUp={(e) => { e.stopPropagation(); handlePointerUp(e); }}
                    onPointerLeave={(e) => { e.stopPropagation(); handlePointerUp(e); }}
                    onDoubleClick={() => {
                        if (zoomLevel > 1) { setZoomLevel(1); setPan({ x: 0, y: 0 }); }
                        else setZoomLevel(2.5);
                    }}
                    data-vaul-no-drag
                >
                    {/* Loading spinner */}
                    {modalImageLoading && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                            <Loader2 className="h-10 w-10 animate-spin text-white/40" />
                        </div>
                    )}

                    {/* Zoom transform wrapper */}
                    <div
                        className="relative w-full h-full transition-transform duration-100 ease-linear origin-center will-change-transform"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentImageIndex}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.04 }}
                                transition={{ duration: 0.28 }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src={imageSrc}
                                    alt={getLocalizedName(item, language)}
                                    fill
                                    className="object-contain pointer-events-none select-none drop-shadow-2xl"
                                    sizes="100vw"
                                    priority
                                    onLoad={handleModalImageLoad}
                                    draggable={false}
                                />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Pagination dots */}
                    {hasMultipleImages && (
                        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5 pointer-events-none">
                            {item.imageUrls!.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1 rounded-full transition-all duration-300",
                                        currentImageIndex === i ? "w-6 bg-white shadow-lg" : "w-1.5 bg-white/30"
                                    )}
                                />
                            ))}
                        </div>
                    )}

                    {/* Prev/Next arrows (multi-image) */}
                    {hasMultipleImages && zoomLevel === 1 && (
                        <>
                            <button
                                onClick={() => { if (currentImageIndex > 0) { setCurrentImageIndex(p => p - 1); setModalImageLoading(true); } else onPrev(); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/50 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => { const c = item.imageUrls!.length; if (currentImageIndex < c - 1) { setCurrentImageIndex(p => p + 1); setModalImageLoading(true); } else onNext(); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/50 transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {/* Zoom controls — bottom right */}
                    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 bg-black/40 backdrop-blur-xl px-1.5 py-1 rounded-full border border-white/10">
                        <button
                            onClick={() => { setZoomLevel(p => Math.max(0.5, p - 0.5)); }}
                            className="h-7 w-7 rounded-full text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <ZoomOut className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-[10px] font-black text-white/70 tabular-nums">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            onClick={() => { setZoomLevel(1); setPan({ x: 0, y: 0 }); }}
                            className="h-7 w-7 rounded-full text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </button>
                        <button
                            onClick={() => setZoomLevel(p => Math.min(5, p + 0.5))}
                            className="h-7 w-7 rounded-full text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                            <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* ══ INFO PANEL — fixed bottom, blurred glass, animates up as content grows ══ */}
                <motion.div
                    className="relative z-10 flex-1 overflow-y-auto overscroll-contain"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    data-vaul-no-drag
                >
                    {/* Glass panel bg — light */}
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl border-t border-black/8 pointer-events-none" />

                    <div className="relative px-5 pt-5 pb-10 space-y-4 max-w-lg mx-auto">

                        {/* Title & Description */}
                        <motion.div
                            initial={{ y: 16, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.08 }}
                        >
                            <h2 className="text-2xl font-black text-gray-900 leading-tight tracking-tight">
                                {getLocalizedName(item, language)}
                            </h2>
                            {getLocalizedDescription(item, language) && (
                                <p className="text-gray-500 text-sm leading-relaxed mt-1.5">
                                    {getLocalizedDescription(item, language)}
                                </p>
                            )}
                        </motion.div>

                        {/* Price (simple items only) */}
                        {(!item.variants || item.variants.length === 0) && !!currentPrice && currentPrice > 0 && (
                            <motion.div
                                className="flex items-center gap-2"
                                initial={{ y: 12, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.35, delay: 0.14 }}
                            >
                                <div className="bg-black/[0.04] px-4 py-2 rounded-xl border border-black/[0.08] backdrop-blur-sm">
                                    <PriceDisplay
                                        price={currentPrice}
                                        discountPrice={
                                            (item.discountEndsAt && new Date(item.discountEndsAt) > new Date())
                                                ? item.discountPrice
                                                : undefined
                                        }
                                        className="text-gray-900"
                                    />
                                </div>
                                {item?.discountEndsAt && new Date(item.discountEndsAt) > new Date() && (
                                    <DiscountTimer
                                        endsAt={item.discountEndsAt}
                                        className="text-xs px-3 py-1.5 bg-red-600/90 text-white border-0 font-bold rounded-xl backdrop-blur-sm"
                                    />
                                )}
                            </motion.div>
                        )}

                        {/* Variants — Vertical list like menu items */}
                        {item.variants && item.variants.length > 0 && (
                            <motion.div
                                className="space-y-3"
                                initial={{ y: 14, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.38, delay: 0.18 }}
                            >
                                {/* Label */}
                                <div className="flex items-center gap-2 mb-2">
                                    <Scale className="w-4 h-4 text-primary/60" />
                                    <span className="text-xs font-black text-gray-500 uppercase tracking-[0.15em]">
                                        {t("menu.variants")}
                                    </span>
                                    <div className="h-px flex-1 bg-black/10" />
                                </div>

                                {/* List */}
                                <div className="grid grid-cols-2 gap-2.5 md:gap-4 pb-4" data-vaul-no-drag>
                                    {item.variants.map((variant, idx) => {
                                        const name = getLocalizedName(variant, language);
                                        const unit = variant.unit || (/^\d+$/.test(name) ? 'gr' : '');
                                        let du = "";
                                        if (unit === 'gr') du = language === 'uz' ? 'gr' : language === 'ru' ? 'гр' : 'g';
                                        else if (unit === 'pc') du = language === 'uz' ? 'dona' : language === 'ru' ? 'шт' : 'pc';
                                        else if (unit === 'kg') du = language === 'uz' ? 'kg' : language === 'ru' ? 'кг' : 'kg';
                                        else if (unit === 'l') du = language === 'uz' ? 'l' : language === 'ru' ? 'л' : 'l';
                                        const displayName = unit && /^\d+$/.test(name) ? `${name} ${du}` : name;

                                        const hasDiscount = variant.discountPrice && variant.discountPrice > 0 && variant.discountPrice < variant.price &&
                                            variant.discountEndsAt && new Date(variant.discountEndsAt) > new Date();
                                        const displayPrice = hasDiscount ? variant.discountPrice! : variant.price;
                                        const discountPercent = hasDiscount ? Math.round((1 - variant.discountPrice! / variant.price) * 100) : 0;

                                        const cartItemId = `${item.id}-${variant.id}`;
                                        const quantity = getItemQuantity(cartItemId);
                                        const stockRaw = item.remainingServings;
                                        const hasStockLimit = stockRaw !== undefined && stockRaw !== null;
                                        const stockNum = hasStockLimit ? Number(stockRaw) : Infinity;
                                        const isAtMax = hasStockLimit && quantity >= stockNum;

                                        const img = (variant.imageUrls && variant.imageUrls.length > 0)
                                            ? variant.imageUrls[0]
                                            : (item.imageUrls && item.imageUrls.length > 0)
                                                ? item.imageUrls[0]
                                                : item.imageUrl;

                                        return (
                                            <motion.div
                                                key={variant.id}
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ duration: 0.3, delay: 0.2 + idx * 0.05 }}
                                                className="relative flex flex-col bg-white rounded-[20px] border border-black/5 shadow-sm overflow-hidden"
                                            >
                                                {/* Variant Image */}
                                                <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center">
                                                    {img ? (
                                                        <Image src={img} alt={name} fill className="object-cover" sizes="50vw" />
                                                    ) : (
                                                        <Box className="w-8 h-8 text-gray-300" />
                                                    )}
                                                    {hasDiscount && (
                                                        <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                                                            -{discountPercent}%
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Variant Info */}
                                                <div className="p-2.5 flex flex-col flex-1">
                                                    <h4 className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 mb-1.5 min-h-[26px]">
                                                        {displayName}
                                                    </h4>
                                                    
                                                    <div className="mt-auto flex flex-col gap-2">
                                                        <div className="flex flex-col">
                                                            {hasDiscount && (
                                                                <span className="text-[9px] font-bold text-gray-400 line-through decoration-red-500/50 leading-none mb-0.5">
                                                                    {variant.price.toLocaleString()}
                                                                </span>
                                                            )}
                                                            <div className="flex items-baseline gap-0.5">
                                                                <span className={cn(
                                                                    "text-[13px] font-black tabular-nums leading-none",
                                                                    hasDiscount ? "text-red-600" : ""
                                                                )} style={!hasDiscount ? { color: primaryColor } : undefined}>
                                                                    {displayPrice.toLocaleString()}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase ml-0.5">
                                                                    $
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Add/Subtract Controls */}
                                                        {quantity > 0 ? (
                                                            <div className="flex items-center justify-between bg-zinc-100/80 rounded-full h-8 px-1 border border-black/5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateItemQuantity(cartItemId, quantity - 1); }}
                                                                    className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-600 hover:text-black active:scale-90 transition-all"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-[11px] font-black text-gray-900 tabular-nums leading-none text-center min-w-[16px]">
                                                                    {quantity}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); !isAtMax && addToCart(item, variant); }}
                                                                    disabled={isAtMax}
                                                                    className={cn("w-6 h-6 rounded-full text-white flex items-center justify-center shadow-md active:scale-90 transition-all", isAtMax ? "opacity-50" : "")}
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                onClick={(e) => { e.stopPropagation(); !isAtMax && addToCart(item, variant); }}
                                                                disabled={isAtMax}
                                                                className="w-full h-8 rounded-full text-white font-black text-[9px] uppercase shadow-md active:scale-95 transition-all px-0"
                                                                style={{ backgroundColor: primaryColor }}
                                                            >
                                                                <ShoppingCart className="w-3 h-3 mr-1" />
                                                                {language === 'uz' ? "Qo'shish" : language === 'ru' ? "В корзину" : "Add"}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* 3D Model Button */}
                        {item.modelUrl && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.22 }}
                                className="mt-4"
                            >
                                <Button
                                    onClick={() => {
                                        const targetRestId = propRestId || authRestId;
                                        router.push(`/3d-view/${item.id}?r=${targetRestId || ""}`);
                                    }}
                                    className="w-full h-16 rounded-[22px] text-white font-black flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all hover:brightness-110"
                                    style={{ 
                                        backgroundColor: primaryColor,
                                        boxShadow: `0 12px 30px ${primaryColor}44`
                                    }}
                                >
                                    <div className="bg-white/20 p-2 rounded-xl">
                                        <Box className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col items-start leading-tight">
                                        <span className="text-[10px] opacity-70 uppercase tracking-widest font-bold">
                                            {language === 'uz' ? "Mahsulotni" : language === 'ru' ? "Смотреть" : "View"}
                                        </span>
                                        <span className="text-sm md:text-base uppercase tracking-tight">
                                            {language === 'uz' ? "3D MODELDA KO'RISH" : language === 'ru' ? "В 3D МОДЕЛИ" : "IN 3D MODEL"}
                                        </span>
                                    </div>
                                </Button>
                            </motion.div>
                        )}
                        {/* Add to Cart Button */}
                        {isOrderingEnabled && (!item.variants || item.variants.length === 0) && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.26 }}
                                className="mt-6 sticky bottom-0"
                            >
                                {(() => {
                                    const cartItemId = item.id;
                                    const quantity = getItemQuantity(cartItemId);

                                    // Remaining stock — number means limited, undefined/null means unlimited
                                    const stockRaw = item.remainingServings;
                                    const hasStockLimit = stockRaw !== undefined && stockRaw !== null;
                                    const stockNum = hasStockLimit ? Number(stockRaw) : Infinity;
                                    const isOutOfStock = hasStockLimit && stockNum <= 0;
                                    const isAtMax = hasStockLimit && quantity >= stockNum;

                                    if (isOutOfStock) {
                                        return (
                                            <Button disabled className="w-full h-16 rounded-[22px] bg-zinc-200 text-zinc-400 font-black cursor-not-allowed">
                                                {t("menu.outOfStock")}
                                            </Button>
                                        );
                                    }

                                    // NEW logic: If isTelegramOrderOnly is on, we only force "Go to Bot" drawer if we are NOT in the Telegram Web App.
                                    // If we ARE in the Telegram Web App, we allow normal ordering.
                                    const forceTelegramDrawer = isTelegramOrderOnly && !isTelegramWebApp;

                                    if (forceTelegramDrawer) {
                                        return (
                                            <Button
                                                onClick={onOrderTelegram}
                                                className="w-full h-16 rounded-[22px] text-white font-black flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all hover:brightness-110"
                                                style={{
                                                    backgroundColor: primaryColor,
                                                    boxShadow: `0 12px 30px ${primaryColor}44`
                                                }}
                                            >
                                                <div className="bg-white/20 p-2 rounded-xl">
                                                    <ShoppingCart className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col items-start leading-tight">
                                                    <span className="text-[10px] opacity-70 uppercase tracking-widest font-bold">
                                                        {language === 'uz' ? "Telegram orqali" : language === 'ru' ? "Через Telegram" : "Via Telegram"}
                                                    </span>
                                                    <span className="text-sm md:text-base uppercase tracking-tight">
                                                        {language === 'uz' ? "BUYURTMA BERISH" : language === 'ru' ? "ЗАКАЗАТЬ" : "ORDER NOW"}
                                                    </span>
                                                </div>
                                            </Button>
                                        );
                                    }

                                    if (quantity > 0) {
                                        return (
                                            <div className="space-y-2">
                                                {/* Stock badge */}
                                                {hasStockLimit && (
                                                    <div className={`text-center text-[11px] font-bold rounded-full py-1 ${
                                                        isAtMax ? 'text-red-600 bg-red-50' : stockNum <= 5 ? 'text-orange-600 bg-orange-50' : 'text-green-700 bg-green-50'
                                                    }`}>
                                                        {isAtMax
                                                            ? language === 'uz' ? `Maksimal ${stockNum} ta buyurtma berish mumkin` : `Максимум ${stockNum} порций`
                                                            : language === 'uz' ? `${stockNum - quantity} ta qoldi` : `Осталось ${stockNum - quantity} порц.`
                                                        }
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-[22px] h-16 px-2 gap-2 border border-black/5 dark:border-white/5 shadow-lg">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-12 w-12 rounded-2xl text-zinc-600 dark:text-zinc-300 hover:text-primary transition-all active:scale-75 bg-black/5 dark:bg-white/5"
                                                        onClick={() => updateItemQuantity(cartItemId, quantity - 1)}
                                                    >
                                                        <Minus className="h-5 w-5" />
                                                    </Button>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-2xl font-black tabular-nums leading-none mb-0.5">{quantity}</span>
                                                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] leading-none">
                                                            {language === 'uz' ? 'Soni' : language === 'ru' ? 'Количество' : 'Count'}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        className={cn(
                                                            "h-12 w-12 rounded-2xl text-white transition-all shadow-xl active:scale-75",
                                                            isAtMax ? 'opacity-40 cursor-not-allowed' : ''
                                                        )}
                                                        style={{ 
                                                            backgroundColor: primaryColor,
                                                            boxShadow: `0 8px 20px ${primaryColor}44`
                                                        }}
                                                        disabled={isAtMax}
                                                        onClick={() => !isAtMax && addToCart(item, undefined)}
                                                    >
                                                        <Plus className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-2">
                                            {/* Stock badge for 0 qty items */}
                                            {hasStockLimit && stockNum <= 10 && stockNum > 0 && (
                                                <div className={`text-center text-[11px] font-bold rounded-full py-1 ${
                                                    stockNum <= 5 ? 'text-orange-600 bg-orange-50' : 'text-green-700 bg-green-50'
                                                }`}>
                                                    {language === 'uz' ? `${stockNum} ta qoldi` : `Осталось ${stockNum} порций`}
                                                </div>
                                            )}
                                            <Button
                                                onClick={() => addToCart(item, undefined)}
                                                className="w-full h-16 rounded-[22px] text-white font-black flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all hover:brightness-110"
                                                style={{
                                                    backgroundColor: primaryColor,
                                                    boxShadow: `0 12px 30px ${primaryColor}44`
                                                }}
                                            >
                                                <div className="bg-white/20 p-2 rounded-xl">
                                                    <ShoppingCart className="w-6 h-6" />
                                                </div>
                                                <div className="flex flex-col items-start leading-tight">
                                                    <span className="text-[10px] opacity-70 uppercase tracking-widest font-bold">
                                                        {language === 'uz' ? "Savatchaga" : language === 'ru' ? "V korzinu" : "To cart"}
                                                    </span>
                                                    <span className="text-sm md:text-base uppercase tracking-tight">
                                                        {language === 'uz' ? "BUYURTMA BERISH" : language === 'ru' ? "ЗАКАЗАТЬ" : "ORDER NOW"}
                                                    </span>
                                                </div>
                                            </Button>
                                        </div>
                                    );
                                })()}
                            </motion.div>
                        )}
                    </div>
                </motion.div>

            </DrawerContent>
        </Drawer>
    );
}

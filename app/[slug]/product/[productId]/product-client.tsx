"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Minus, Plus, ShoppingCart, ChevronLeft, ChevronRight, Play } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { getLocalizedName } from "@/lib/localization"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Drawer } from "vaul"
import { motion, AnimatePresence } from "framer-motion"

function getKinescopeEmbedUrl(url: string): string {
    if (!url) return "";
    const id = url.split('/').pop();
    return `https://kinescope.io/embed/${id}`;
}
function VariantCard({ variant, product, language, primaryColor, onSelect }: any) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const images = useMemo(() => {
        if (variant.imageUrls && variant.imageUrls.length > 0) return variant.imageUrls;
        if (product.imageUrls && product.imageUrls.length > 0) return product.imageUrls;
        if (product.imageUrl) return [product.imageUrl];
        return [];
    }, [variant, product]);

    const name = getLocalizedName(variant, language);
    const unit = variant.unit || (/^\d+$/.test(name) ? 'gr' : '');
    let du = "";
    if (unit === 'gr') du = language === 'uz' ? 'gr' : language === 'ru' ? 'гр' : 'g';
    else if (unit === 'pc') du = language === 'uz' ? 'dona' : language === 'ru' ? 'шт' : 'pc';
    else if (unit === 'kg') du = language === 'uz' ? 'kg' : language === 'ru' ? 'кг' : 'kg';
    else if (unit === 'l') du = language === 'uz' ? 'l' : language === 'ru' ? 'л' : 'l';
    const displayName = unit && /^\d+$/.test(name) ? `${name} ${du}` : name;

    const hasDiscount = variant.discountPrice && variant.discountPrice > 0 && variant.discountPrice < variant.price &&
        variant.discountEndsAt && new Date(variant.discountEndsAt._seconds ? variant.discountEndsAt._seconds * 1000 : variant.discountEndsAt) > new Date();
    const displayPrice = hasDiscount ? variant.discountPrice! : variant.price;
    const discountPercent = hasDiscount ? Math.round((1 - variant.discountPrice! / variant.price) * 100) : 0;

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div
            onClick={onSelect}
            className="relative flex flex-col bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-transform"
        >
            <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center overflow-hidden">
                {images.length > 0 ? (
                    <AnimatePresence initial={false} mode="wait">
                        <motion.div
                            key={currentImageIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0"
                        >
                            <Image src={images[currentImageIndex]} alt={name} fill className="object-cover" sizes="50vw" />
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="w-8 h-8 text-gray-300" />
                )}

                {images.length > 1 && (
                    <>
                        <button
                            onClick={prevImage}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={nextImage}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                            {images.map((_: any, i: number) => (
                                <div key={i} className={cn("h-1 rounded-full transition-all", i === currentImageIndex ? "w-3 bg-white" : "w-1.5 bg-white/50")} />
                            ))}
                        </div>
                    </>
                )}

                {hasDiscount && (
                    <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                        -{discountPercent}%
                    </div>
                )}
            </div>

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
                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-0.5">$</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}



export function ProductClient({ restaurant, product, slug }: { restaurant: any, product: any, slug: string }) {
    const router = useRouter()
    const { t, language } = useLanguage()
    const { addToCart, getItemQuantity, updateItemQuantity } = useCart()

    const [selectedVariant, setSelectedVariant] = useState<any | null>(null)
    const [drawerImageIndex, setDrawerImageIndex] = useState(0)
    const [mainImageIndex, setMainImageIndex] = useState(0)

    useEffect(() => {
        setDrawerImageIndex(0)
    }, [selectedVariant])

    const primaryColor = restaurant?.primaryColor || '#f43f5e'
    const productName = getLocalizedName(product, language)

    const drawerMedia = useMemo(() => {
        if (!selectedVariant) return [];
        const media: { type: 'image' | 'video', url: string }[] = [];
        
        if (product.videoUrl) {
            media.push({ type: 'video', url: product.videoUrl });
        }
        
        let images = [];
        if (selectedVariant.imageUrls && selectedVariant.imageUrls.length > 0) {
            images = selectedVariant.imageUrls;
        } else if (product.imageUrls && product.imageUrls.length > 0) {
            images = product.imageUrls;
        } else if (product.imageUrl) {
            images = [product.imageUrl];
        }
        
        images.forEach(img => media.push({ type: 'image', url: img }));
        return media;
    }, [selectedVariant, product]);

    const mainMedia = useMemo(() => {
        const media: { type: 'image' | 'video', url: string }[] = [];
        if (product.videoUrl) {
            media.push({ type: 'video', url: product.videoUrl });
        }
        
        let images = [];
        if (product.imageUrls && product.imageUrls.length > 0) {
            images = product.imageUrls;
        } else if (product.imageUrl) {
            images = [product.imageUrl];
        }
        
        images.forEach(img => media.push({ type: 'image', url: img }));
        return media;
    }, [product]);

    const nextMainImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setMainImageIndex((prev) => (prev + 1) % mainMedia.length);
    };

    const prevMainImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setMainImageIndex((prev) => (prev - 1 + mainMedia.length) % mainMedia.length);
    };

    const nextDrawerImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDrawerImageIndex((prev) => (prev + 1) % drawerMedia.length);
    };

    const prevDrawerImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDrawerImageIndex((prev) => (prev - 1 + drawerMedia.length) % drawerMedia.length);
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 flex flex-col pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 shadow-sm px-4 h-14 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center active:bg-black/5 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-900" />
                </button>
                <h1 className="font-bold text-gray-900 text-sm truncate px-2">{productName}</h1>
                <div className="w-10" />
            </div>

            {/* Main Product Info Carousel */}
            {mainMedia.length > 0 && (
                <div className="w-full aspect-video relative bg-gray-100 overflow-hidden">
                    <AnimatePresence initial={false} mode="wait">
                        <motion.div
                            key={mainImageIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0"
                        >
                            {mainMedia[mainImageIndex].type === 'video' ? (
                                <iframe
                                    src={getKinescopeEmbedUrl(mainMedia[mainImageIndex].url)}
                                    className="w-full h-full"
                                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                                    frameBorder="0"
                                    allowFullScreen
                                />
                            ) : (
                                <Image src={mainMedia[mainImageIndex].url} alt={productName} fill className="object-cover" priority />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {mainMedia.length > 1 && (
                        <>
                            <button
                                onClick={prevMainImage}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white z-10"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={nextMainImage}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white z-10"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                                {mainMedia.map((_: any, i: number) => (
                                    <div key={i} className={cn("h-1.5 rounded-full transition-all shadow-sm", i === mainImageIndex ? "w-5 bg-white" : "w-2 bg-white/50")} />
                                ))}
                            </div>
                        </>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-4 right-4 pointer-events-none">
                        <h2 className="text-white font-black text-xl leading-tight" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{productName}</h2>
                        <p className="text-white/90 text-xs font-medium mt-1">{language === 'uz' ? 'Variantni tanlang' : language === 'ru' ? 'Выберите вариант' : 'Select a variant'}</p>
                    </div>
                </div>
            )}

            <div className="p-4 flex-1">
                {!product.imageUrl && (
                    <div className="mb-4">
                        <h2 className="text-gray-900 font-black text-xl leading-tight">{productName}</h2>
                        <p className="text-gray-500 text-xs font-medium mt-1">{language === 'uz' ? 'Variantni tanlang' : language === 'ru' ? 'Выберите вариант' : 'Select a variant'}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {product.variants?.map((variant: any, idx: number) => (
                        <VariantCard
                            key={variant.id}
                            variant={variant}
                            product={product}
                            language={language}
                            primaryColor={primaryColor}
                            onSelect={() => setSelectedVariant(variant)}
                        />
                    ))}
                </div>
            </div>

            {/* Drawer for Selected Variant */}
            <Drawer.Root open={!!selectedVariant} onOpenChange={(o) => !o && setSelectedVariant(null)}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm" />
                    <Drawer.Content className="bg-slate-50 flex flex-col rounded-t-[32px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-[100] outline-none">
                        <Drawer.Title className="sr-only">Variant Details</Drawer.Title>
                        <div className="p-4 bg-slate-50 rounded-t-[32px] w-full flex justify-center sticky top-0 z-10 touch-none">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                        </div>

                        {selectedVariant && (() => {
                            const name = getLocalizedName(selectedVariant, language);
                            const unit = selectedVariant.unit || (/^\d+$/.test(name) ? 'gr' : '');
                            let du = "";
                            if (unit === 'gr') du = language === 'uz' ? 'gr' : language === 'ru' ? 'гр' : 'g';
                            else if (unit === 'pc') du = language === 'uz' ? 'dona' : language === 'ru' ? 'шт' : 'pc';
                            else if (unit === 'kg') du = language === 'uz' ? 'kg' : language === 'ru' ? 'кг' : 'kg';
                            else if (unit === 'l') du = language === 'uz' ? 'l' : language === 'ru' ? 'л' : 'l';
                            const displayName = unit && /^\d+$/.test(name) ? `${name} ${du}` : name;

                            const hasDiscount = selectedVariant.discountPrice && selectedVariant.discountPrice > 0 && selectedVariant.discountPrice < selectedVariant.price &&
                                selectedVariant.discountEndsAt && new Date(selectedVariant.discountEndsAt._seconds ? selectedVariant.discountEndsAt._seconds * 1000 : selectedVariant.discountEndsAt) > new Date();
                            const displayPrice = hasDiscount ? selectedVariant.discountPrice! : selectedVariant.price;
                            const discountPercent = hasDiscount ? Math.round((1 - selectedVariant.discountPrice! / selectedVariant.price) * 100) : 0;

                            const cartItemId = `${product.id}-${selectedVariant.id}`;
                            const quantity = getItemQuantity(cartItemId);
                            const stockRaw = product.remainingServings;
                            const hasStockLimit = stockRaw !== undefined && stockRaw !== null;
                            const stockNum = hasStockLimit ? Number(stockRaw) : Infinity;
                            const isAtMax = hasStockLimit && quantity >= stockNum;

                            return (
                                <>
                                    <div className="flex-1 overflow-y-auto pb-24">
                                        <div className="px-4 pb-6">
                                            <div className="relative w-full aspect-square bg-white rounded-[32px] overflow-hidden border border-black/5 shadow-sm mb-6">
                                                {drawerMedia.length > 0 ? (
                                                    <AnimatePresence initial={false} mode="wait">
                                                        <motion.div
                                                            key={drawerImageIndex}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="absolute inset-0"
                                                        >
                                                            {drawerMedia[drawerImageIndex].type === 'video' ? (
                                                                <div className="w-full h-full relative" style={{ paddingTop: '0%' }}>
                                                                    <iframe
                                                                        src={getKinescopeEmbedUrl(drawerMedia[drawerImageIndex].url)}
                                                                        className="absolute inset-0 w-full h-full"
                                                                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
                                                                        frameBorder="0"
                                                                        allowFullScreen
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <Image src={drawerMedia[drawerImageIndex].url} alt={name} fill className="object-cover" />
                                                            )}
                                                        </motion.div>
                                                    </AnimatePresence>
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                        <div className="w-12 h-12 text-gray-300" />
                                                    </div>
                                                )}

                                                {drawerMedia.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={prevDrawerImage}
                                                            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"
                                                        >
                                                            <ChevronLeft className="w-6 h-6" />
                                                        </button>
                                                        <button
                                                            onClick={nextDrawerImage}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white"
                                                        >
                                                            <ChevronRight className="w-6 h-6" />
                                                        </button>

                                                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                                                            {drawerMedia.map((_: any, i: number) => (
                                                                <div key={i} className={cn("h-1.5 rounded-full transition-all shadow-sm", i === drawerImageIndex ? "w-5 bg-white" : "w-2 bg-white/50")} />
                                                            ))}
                                                        </div>
                                                    </>
                                                )}

                                                {hasDiscount && (
                                                    <div className="absolute top-3 left-3 bg-red-600 text-white font-black px-2 py-1 rounded-full shadow-md text-xs">
                                                        -{discountPercent}%
                                                    </div>
                                                )}
                                            </div>

                                            <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2">
                                                {displayName}
                                            </h2>

                                            <div className="flex items-end gap-2 mb-4">
                                                {hasDiscount && (
                                                    <span className="text-base font-bold text-gray-400 line-through decoration-red-500/50">
                                                        {selectedVariant.price.toLocaleString()}
                                                    </span>
                                                )}
                                                <div className="flex items-baseline gap-1">
                                                    <span className={cn(
                                                        "text-3xl font-black tabular-nums leading-none",
                                                        hasDiscount ? "text-red-600" : "text-gray-900"
                                                    )} style={!hasDiscount ? { color: primaryColor } : undefined}>
                                                        {displayPrice.toLocaleString()}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-500 uppercase">
                                                        $
                                                    </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Section removed since it's in the carousel */}
                                </div>

                                    {/* Bottom Fixed Bar */}
                                    {/* <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-black/5 z-20 pb-safe">
                                {quantity > 0 ? (
                                    <div className="flex items-center justify-between bg-zinc-100/80 rounded-full h-14 px-2 border border-black/5">
                                        <button
                                            onClick={() => updateItemQuantity(cartItemId, quantity - 1)}
                                            className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-600 active:scale-90 transition-transform"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <span className="text-xl font-black text-gray-900 tabular-nums min-w-[32px] text-center">{quantity}</span>
                                        <button
                                            onClick={() => !isAtMax && addToCart(product, selectedVariant)}
                                            disabled={isAtMax}
                                            className={cn("w-12 h-12 rounded-full text-white shadow-md flex items-center justify-center active:scale-90 transition-transform", isAtMax && "opacity-50")}
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => !isAtMax && addToCart(product, selectedVariant)}
                                        disabled={isAtMax}
                                        className="w-full h-14 rounded-full text-white font-black text-sm uppercase shadow-xl active:scale-95 transition-transform"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <ShoppingCart className="w-5 h-5 mr-2" />
                                        {language === 'uz' ? "Savatchaga qo'shish" : language === 'ru' ? "В корзину" : "Add to Cart"}
                                    </Button>
                                )}
                            </div> */}
                                </>
                            );
                        })()}
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

        </div>
    )
}

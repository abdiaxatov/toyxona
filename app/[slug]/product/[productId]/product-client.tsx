"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Minus, Plus, ShoppingCart, X } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"
import { getLocalizedName } from "@/lib/localization"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Drawer } from "vaul"

export function ProductClient({ restaurant, product, slug }: { restaurant: any, product: any, slug: string }) {
  const router = useRouter()
  const { t, language } = useLanguage()
  const { addToCart, getItemQuantity, updateItemQuantity } = useCart()

  const [selectedVariant, setSelectedVariant] = useState<any | null>(null)

  const primaryColor = restaurant?.primaryColor || '#f43f5e'
  const productName = getLocalizedName(product, language)

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

      {/* Main Product Info */}
      {product.imageUrl && (
        <div className="w-full aspect-video relative bg-gray-100">
          <Image src={product.imageUrl} alt={productName} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
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
          {product.variants?.map((variant: any, idx: number) => {
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

            const img = (variant.imageUrls && variant.imageUrls.length > 0)
                ? variant.imageUrls[0]
                : (product.imageUrls && product.imageUrls.length > 0)
                    ? product.imageUrls[0]
                    : product.imageUrl;

            return (
                <div
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className="relative flex flex-col bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-transform"
                >
                    <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center">
                        {img ? (
                            <Image src={img} alt={name} fill className="object-cover" sizes="50vw" />
                        ) : (
                            <div className="w-8 h-8 text-gray-300" />
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
          })}
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

                    const img = (selectedVariant.imageUrls && selectedVariant.imageUrls.length > 0)
                        ? selectedVariant.imageUrls[0]
                        : (product.imageUrls && product.imageUrls.length > 0)
                            ? product.imageUrls[0]
                            : product.imageUrl;

                    return (
                        <>
                            <div className="flex-1 overflow-y-auto pb-24">
                                <div className="px-4 pb-6">
                                    <div className="relative w-full aspect-square bg-white rounded-[32px] overflow-hidden border border-black/5 shadow-sm mb-6">
                                        {img ? (
                                            <Image src={img} alt={name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                <div className="w-12 h-12 text-gray-300" />
                                            </div>
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
                            </div>
                            
                            {/* Bottom Fixed Bar */}
                        </>
                    );
                })()}
            </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

    </div>
  )
}

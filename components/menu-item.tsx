"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, Loader2, ChevronLeft, ChevronRight, Box, Plus, Minus, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/components/cart-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { optimizeImage } from "@/lib/image-optimizer";
import { PriceDisplay } from "@/components/price-display";
import { DiscountTimer } from "@/components/discount-timer";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedName } from "@/lib/localization";
import type { MenuItem as MenuItemType } from "@/types";

interface MenuItemProps {
  item: MenuItemType;
  priority?: boolean;
  onClick?: () => void;
  primaryColor?: string;
  columns?: number;
  restaurantId?: string;
  isOrderingEnabled?: boolean;
  isTelegramWebApp?: boolean;
  isTelegramOrderOnly?: boolean;
  onOrderTelegram?: () => void;
}

const MotionCard = motion(Card);

export const MenuItemComponent = React.memo(function MenuItemComponent({
  item,
  priority = false,
  onClick,
  primaryColor,
  columns = 2,
  restaurantId,
  isOrderingEnabled = true,
  isTelegramWebApp,
  isTelegramOrderOnly = false,
  onOrderTelegram,
}: MenuItemProps) {
  const router = useRouter();
  const { addToCart, getItemQuantity, updateItemQuantity } = useCart();
  const [is3DLoading, setIs3DLoading] = useState(false);
  const { t, language } = useLanguage();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = useMemo(() => {
    if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls;
    if (item.imageUrl) return [item.imageUrl];
    return ["/placeholder.svg"];
  }, [item.imageUrls, item.imageUrl]);

  const optimizedUrls = useMemo(
    () => images.map(url => optimizeImage(url, 400)),
    [images]
  );

  // Fix: Only mark as out of stock if values are explicitly provided and <= 0
  const stockRaw = item.remainingServings;
  const hasStockLimit = stockRaw !== undefined && stockRaw !== null;
  const stockNum = hasStockLimit ? Number(stockRaw) : Infinity;
  const isOutOfStock = hasStockLimit && stockNum <= 0;
  const isLowStock = hasStockLimit && stockNum > 0 && stockNum <= 5;

  const handle3DView = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIs3DLoading(true);
      const query = restaurantId ? `?r=${restaurantId}` : "";
      router.push(`/3d-view/${item.id}${query}`);
    },
    [router, item.id, restaurantId]
  );

  const handleImageClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const nextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const isCompact = columns >= 3;

  return (
    <MotionCard
      onClick={onClick}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group overflow-hidden border border-white/40 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[32px] menu-item-card cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
        isOutOfStock && "grayscale-[0.5] opacity-80"
      )}
      style={{
        contain: "layout style paint",
      }}
    >
      <div
        className="relative aspect-square overflow-hidden menu-item-image"
        style={{
          contain: "strict",
          backgroundColor: "#f3f4f6",
        }}
      >
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentImageIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-0 z-10"
              style={{ transformOrigin: "center center" }}
            >
              <Image
                src={optimizedUrls[currentImageIndex]}
                alt={getLocalizedName(item, language)}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                loading={priority ? "eager" : "lazy"}
                priority={priority}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== images[currentImageIndex]) {
                    target.src = images[currentImageIndex];
                  }
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Navigation Arrows */}
        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between px-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 pointer-events-auto shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 pointer-events-auto shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute inset-x-0 top-0 p-2 flex justify-between items-start z-30 pointer-events-none">
          <div className="flex flex-col gap-1">
            {isOutOfStock && (
              <Badge className="bg-black/70 backdrop-blur-md text-white text-[9px] font-bold py-0.5 px-2 border-none rounded-full animate-in fade-in zoom-in">
                {t("menu.outOfStock")}
              </Badge>
            )}
            {!isOutOfStock && (() => {
              const now = new Date();
              let maxDiscount = 0;

              // Check main item discount
              if (item.discountPrice && item.discountEndsAt && new Date(item.discountEndsAt) > now) {
                maxDiscount = Math.round((1 - item.discountPrice / item.price) * 100);
              }

              // Check variant discounts
              if (item.variants) {
                item.variants.forEach(v => {
                  if (v.discountPrice && v.discountEndsAt && new Date(v.discountEndsAt) > now) {
                    const d = Math.round((1 - v.discountPrice / v.price) * 100);
                    if (d > maxDiscount) maxDiscount = d;
                  }
                });
              }

              if (maxDiscount > 0) {
                return (
                  <div className="animate-in fade-in zoom-in flex flex-col gap-1">
                    <Badge className="bg-red-600 text-white text-[10px] font-black py-0.5 px-2 border-none rounded-full shadow-lg">
                      -{maxDiscount}%
                    </Badge>
                    {item.discountEndsAt && new Date(item.discountEndsAt) > now && (
                      <DiscountTimer
                        endsAt={item.discountEndsAt}
                        className="text-[8px] px-1.5 py-0.5 bg-black/60 text-white border-none backdrop-blur-md font-black tracking-tighter rounded-full gap-1"
                      />
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {item.modelUrl && (
            <Button
              onClick={handle3DView}
              size="icon"
              className={cn(
                "pointer-events-auto h-8 w-8 rounded-full bg-white/90 backdrop-blur-md text-primary shadow-lg hover:bg-white transition-all scale-90 group-hover:scale-100",
                isCompact && "h-7 w-7"
              )}
              disabled={is3DLoading}
            >
              {is3DLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Box className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 z-20 pointer-events-auto">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(i);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 shadow-sm",
                  currentImageIndex === i ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        )}

        {/* Gradient Bottom Shadow */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent z-10 pointer-events-none" />
      </div>

      <CardContent className={cn("p-2.5 space-y-1", isCompact && "p-2 space-y-0.5", columns >= 4 && "p-1.5")}>
        <h3 className={cn(
          "font-bold text-gray-800 line-clamp-2 leading-tight",
          columns >= 4 ? "text-[9px]" : isCompact ? "text-[11px]" : "text-sm"
        )}>
          {getLocalizedName(item, language)}
        </h3>

        {/* Stock indicator */}
        {hasStockLimit && stockNum > 0 && stockNum <= 10 && (
          <span className={cn(
            "inline-block rounded-full font-black leading-none",
            isCompact ? "text-[8px] px-1.5 py-0.5 mt-0.5" : "text-[9px] px-2 py-0.5 mt-0.5",
            stockNum <= 5 ? "bg-orange-100 text-orange-600" : "bg-green-50 text-green-700"
          )}>
            {stockNum} {language === 'uz' ? 'ta qoldi' : language === 'ru' ? 'осталось' : 'left'}
          </span>
        )}
        {isOutOfStock && (
          <span className={cn(
            "inline-block rounded-full font-black leading-none bg-red-100 text-red-600",
            isCompact ? "text-[8px] px-1.5 py-0.5 mt-0.5" : "text-[9px] px-2 py-0.5 mt-0.5"
          )}>
            {language === 'uz' ? 'Tugagan' : language === 'ru' ? 'Нет в наличии' : 'Out of stock'}
          </span>
        )}

        <div className="flex flex-col items-center gap-1.5 mt-auto pt-1">
          <div className="w-full">
            {item.variants && item.variants.length > 0 ? (
              (() => {
                const now = new Date();
                const prices = item.variants.map(v => {
                  if (v.discountPrice && v.discountEndsAt && new Date(v.discountEndsAt) > now) {
                    return v.discountPrice;
                  }
                  return v.price;
                });
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);

                if (!maxPrice || maxPrice === 0) return null;

                return (
                  <div className="w-full">
                    <div className="flex flex-col items-center w-full text-primary leading-tight" style={primaryColor ? { color: primaryColor } : undefined}>
                      <span className={cn(
                        "font-black tracking-tighter whitespace-nowrap",
                        columns >= 4 ? "text-[10px]" : isCompact ? "text-xs" : "text-lg"
                      )}>
                        {(() => {
                          if (minPrice === maxPrice) {
                            return minPrice.toLocaleString();
                          }
                          // If price is too long in compact mode, use shorter format
                          if (columns >= 4) {
                            return `${minPrice.toLocaleString()}-${maxPrice.toLocaleString()}`;
                          }
                          return `${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`;
                        })()}
                      </span>
                      <span className={cn(
                        "font-black text-slate-400 uppercase tracking-tighter shrink-0",
                        columns >= 4 ? "text-[7px]" : "ml-1 text-[0.6em]"
                      )}>
                        "$"
                      </span>
                    </div>
                  </div>
                );
              })()
            ) : (
              <PriceDisplay
                price={item.price}
                discountPrice={
                  item.discountEndsAt && new Date(item.discountEndsAt) > new Date()
                    ? item.discountPrice
                    : undefined
                }
                className="w-full justify-center"
                isCompact={isCompact || columns >= 4}
                columns={columns}
                primaryColor={primaryColor}
              />
            )}
          </div>

          {isOrderingEnabled && !isOutOfStock && (() => {
            const quantity = getItemQuantity(item.id);
            const hasVariants = item.variants && item.variants.length > 0;
            const isAtMax = hasStockLimit && quantity >= stockNum;

            // NEW logic: If isTelegramOrderOnly is on, we only force "Go to Bot" drawer if we are NOT in the Telegram Web App.
            // If we ARE in the Telegram Web App, we allow normal ordering.
            const forceTelegramDrawer = isTelegramOrderOnly && !isTelegramWebApp;

            if (forceTelegramDrawer || hasVariants || quantity === 0) {
              const buttonText = forceTelegramDrawer 
                ? (language === 'uz' ? (columns >= 4 ? "Buyurtma" : "Buyurtma berish") : language === 'ru' ? "Заказать" : "Order")
                : (language === 'uz' ? (columns >= 4 ? "Buyurtma" : "Buyurtma berish")
                  : language === 'ru' ? (columns >= 4 ? "Заказать" : "Купить")
                  : "Order Now");
                
              return (
                <Button
                  className={cn(
                    "w-full shadow-lg shrink-0 transition-all active:scale-95 font-black uppercase tracking-tight overflow-hidden gap-1.5 px-3",
                    columns >= 4 ? "h-[22px] text-[7px] rounded-lg px-1.5" : isCompact ? "h-7 text-[9px] rounded-xl px-2" : "h-10 text-[11px] rounded-2xl"
                  )}
                  style={{ backgroundColor: primaryColor || '#f43f5e' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (forceTelegramDrawer) {
                      onOrderTelegram?.();
                    } else if (hasVariants) {
                      onClick?.();
                    } else {
                      addToCart(item);
                    }
                  }}
                >
                  <ShoppingCart className={cn("shrink-0", columns >= 4 ? "h-2 w-2" : isCompact ? "h-3 w-3" : "h-4 w-4")} />
                  <span className="truncate">{buttonText}</span>
                </Button>
              );
            }

            return (
              <div className={cn(
                "flex items-center bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-full shadow-xl border border-black/5 dark:border-white/5",
                columns >= 4 ? "h-6 px-0.5 gap-0.5 w-full justify-between" : isCompact ? "h-7 px-1 gap-1" : "h-9 px-1 gap-2"
              )}>
                <button
                   className={cn(
                    "rounded-full flex items-center justify-center text-zinc-500 hover:text-primary transition-all active:scale-75",
                    columns >= 4 ? "w-5 h-5 outline-none" : "w-7 h-7"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateItemQuantity(item.id, quantity - 1);
                  }}
                >
                  <Minus className={cn(columns >= 4 ? "h-2 w-2" : "h-4 w-4")} />
                </button>
                <span className={cn(
                  "font-black text-center tabular-nums whitespace-nowrap leading-none flex items-center justify-center",
                  columns >= 4 ? "text-[9px] min-w-[12px]" : "text-xs min-w-[16px]"
                )}>
                  {quantity}
                </span>
                <button
                  className={cn(
                    "rounded-full flex items-center justify-center text-white transition-all active:scale-75 shadow-lg",
                    columns >= 4 ? "w-5 h-5 border border-white/10" : "w-7 h-7",
                    isAtMax ? 'opacity-40 cursor-not-allowed' : ''
                  )}
                  style={{ backgroundColor: isAtMax ? '#9ca3af' : (primaryColor || '#f43f5e') }}
                  disabled={isAtMax}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAtMax) addToCart(item);
                  }}
                >
                  <Plus className={cn(columns >= 4 ? "h-2 w-2" : "h-4 w-4")} />
                </button>
              </div>
            );
          })()}
        </div>
      </CardContent>
    </MotionCard>
  );
});


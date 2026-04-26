"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingDown } from "lucide-react";
import type { MenuItem, Category, TvSettings } from "@/types";
import { cn } from "@/lib/utils";

interface TvCategorySlideProps {
  category: Category;
  items: MenuItem[];
  settings: TvSettings | null;
  onNextCategory?: () => void;
}

export function TvCategorySlide({ category, items, settings, onNextCategory }: TvCategorySlideProps) {
  const showImages = settings?.showImages !== false;
  const columns = settings?.columns || 2;
  const rows = settings?.rows || 2;
  const fontSize = settings?.fontSize || "medium";

  // Font size maps
  const nameSz = {
    small: "text-base",
    medium: "text-lg",
    large: "text-xl",
    xl: "text-2xl",
  }[fontSize];

  const priceSz = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
    xl: "text-xl",
  }[fontSize];

  // Items per page: based on columns and rows
  const ITEMS_PER_PAGE = columns * rows;

  // Filter out-of-stock items entirely if admin chose to hide them
  const validItems = items.filter(item => {
    if (settings?.showOutOfStock === false) {
      if (item.available === false || item.isAvailable === false) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(validItems.length / ITEMS_PER_PAGE));
  const [page, setPage] = useState(0);

  // Auto-advance logic: managed completely by the slide so it finishes paging before moving category!
  const slideDurationMs = (settings?.slideDuration || 15) * 1000;

  useEffect(() => {
    setPage(0); // reset when items/category change
  }, [category?.id]); // Reset only when changing categories, not just items reference

  useEffect(() => {
    if (totalPages <= 1) {
      // Just wait for slide duration and move to the next category
      const t = setTimeout(() => {
        onNextCategory?.();
      }, slideDurationMs);
      return () => clearTimeout(t);
    } else {
      // Loop through pages and THEN move to next category
      const t = setTimeout(() => {
        if (page + 1 >= totalPages) {
          onNextCategory?.();
        } else {
          setPage(page + 1);
        }
      }, slideDurationMs);
      return () => clearTimeout(t);
    }
  }, [totalPages, slideDurationMs, onNextCategory, page]);

  const pageItems = validItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns] ?? "grid-cols-2";

  const gridRows = {
    1: "grid-rows-1",
    2: "grid-rows-2",
    3: "grid-rows-3",
    4: "grid-rows-4",
    5: "grid-rows-5",
  }[rows] ?? "grid-rows-2";

  const transitionStyle = settings?.transitionStyle || "fade";
  const slideAnim = {
    fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    slide: { initial: { opacity: 0, x: 50 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -50 } },
    zoom: { initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.02 } },
  }[transitionStyle];

  const radiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-2xl",
    full: "rounded-[32px]",
  }[settings?.cardRadius || "lg"] ?? "rounded-2xl";

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* ── Category Header ── */}
      <div className="flex-none px-12 pt-6 pb-5 bg-transparent border-b border-black/5 flex items-center gap-4">
        <div className="w-1 h-9 rounded-full flex-none opacity-50" style={{ backgroundColor: "var(--tv-text)" }} />
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-black tracking-tight truncate" style={{ color: "var(--tv-text)" }}>
            {category?.name_uz || category?.name}
          </h2>
          {category?.description_uz && (
            <p className="text-sm font-bold mt-0.5 truncate opacity-40" style={{ color: "var(--tv-text)" }}>
              {category.description_uz}
            </p>
          )}
        </div>
        {/* Page indicator */}
        {totalPages > 1 && (
          <div className="flex-none flex items-center gap-1.5 rounded-full px-4 py-1.5 border border-black/5 shadow-sm" style={{ backgroundColor: "var(--tv-card)" }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-400",
                  i === page ? "w-5 h-2 opacity-100" : "w-2 h-2 opacity-20"
                )}
                style={{ backgroundColor: "var(--tv-text)" }}
              />
            ))}
          </div>
        )}
        <span className="flex-none text-xs font-bold uppercase tracking-widest opacity-40" style={{ color: "var(--tv-text)" }}>
          {validItems.length} taom
        </span>
      </div>

      {/* ── Items Grid ── */}
      <div className="flex-1 overflow-hidden px-12 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={slideAnim.initial}
            animate={slideAnim.animate}
            exit={slideAnim.exit}
            transition={{ duration: 0.4 }}
            className={cn("grid gap-4 h-full content-stretch min-h-0", gridCols, gridRows)}
          >
            {pageItems.map((item, idx) => {
              const isOutOfStock = !item.isAvailable || item.available === false;
              const imgSrc = item.imageUrl || item.imageUrls?.[0];
              const hasVariants = item.variants && item.variants.length > 0;
              const isTop = !item.isNew && !isOutOfStock && (items.indexOf(item) % 7 === 0);
              const hasDiscount = !hasVariants && !!item.discountPrice && item.discountPrice < item.price;
              const discountPct = hasDiscount
                ? Math.round((1 - item.discountPrice! / item.price) * 100)
                : 0;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03, duration: 0.25 }}
                  className={cn(
                    "relative border border-black/5 shadow-sm overflow-hidden",
                    "flex flex-col h-full",
                    radiusClass,
                    isOutOfStock && "opacity-50"
                  )}
                  style={{ backgroundColor: "var(--tv-card)" }}
                >
                  {showImages && (
                    <div className="relative flex-1 min-h-0 overflow-hidden bg-black/5">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-4xl text-gray-200">🍽</span>
                        </div>
                      )}
                      {/* Sold out stamp */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-red-500 rotate-[-20deg] border border-red-400 px-1.5 py-0.5 rounded">
                            Tugagan
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Text Content ── */}
                  <div className={cn(
                    "flex flex-col justify-between flex-none min-w-0 bg-transparent",
                    showImages ? "p-3.5 gap-2" : "p-4 gap-3",
                  )}>
                    {/* Top: badges + name */}
                    <div className="space-y-1.5">
                      {/* Badges */}
                      {settings?.showBadges !== false && (item.isNew || isTop || (isOutOfStock && !showImages) || hasDiscount) && (
                        <div className="flex flex-wrap gap-1">
                          {item.isNew && (
                            <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full tracking-wide">
                              ✦ Yangi
                            </span>
                          )}
                          {isTop && (
                            <span className="text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full tracking-wide">
                              ★ TOP
                            </span>
                          )}
                          {hasDiscount && (
                            <motion.span 
                              animate={{ scale: [1, 1.1, 1], rotate: [0, -2, 2, 0] }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="text-xs font-black bg-gradient-to-r from-red-600 to-red-500 text-white px-2 py-1 rounded-lg border border-red-400 shadow-lg flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5 fill-white/20" />
                              -{discountPct}%
                            </motion.span>
                          )}
                          {isOutOfStock && !showImages && (
                            <span className="text-[9px] font-black uppercase bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-full">
                              Tugagan
                            </span>
                          )}
                        </div>
                      )}

                      {/* Item name */}
                      <h3 className={cn(
                        "font-bold leading-snug",
                        nameSz,
                        showImages ? "line-clamp-2" : "line-clamp-1"
                      )} style={{ color: "var(--tv-text)" }}>
                        {item.name_uz || item.name}
                      </h3>

                      {settings?.showDescriptions !== false && item.description_uz && (
                        <p className="text-xs line-clamp-1 opacity-50" style={{ color: "var(--tv-text)" }}>
                          {item.description_uz}
                        </p>
                      )}
                    </div>

                    {/* Bottom: price block */}
                    <div className="border-t border-black/5 pt-2">
                      {hasVariants ? (
                        // ── All variant prices listed individually ──
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {item.variants!.map((v, vi) => {
                            const vHasDiscount = !!v.discountPrice && v.discountPrice < v.price;
                            return (
                              <div key={vi} className="flex items-baseline gap-1">
                                <span className="text-[10px] font-semibold opacity-40" style={{ color: "var(--tv-text)" }}>
                                  {v.name_uz || v.name}:
                                </span>
                                {vHasDiscount ? (
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn("font-black text-red-600", fontSize === 'xl' ? 'text-2xl' : 'text-xl')} style={{ color: "var(--tv-text)" }}>
                                        {v.discountPrice!.toLocaleString()}
                                      </span>
                                      <span className="text-[10px] line-through opacity-30 italic" style={{ color: "var(--tv-text)" }}>
                                        {v.price.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className={cn("font-black", priceSz)} style={{ color: "var(--tv-text)" }}>
                                    {v.price.toLocaleString()}
                                  </span>
                                )}
                                <span className="text-[10px] opacity-40" style={{ color: "var(--tv-text)" }}>so'm</span>
                                {vi < item.variants!.length - 1 && (
                                  <span className="ml-1 opacity-20" style={{ color: "var(--tv-text)" }}>·</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : hasDiscount ? (
                        // ── Discounted price ──
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                              <span className={cn("font-black text-red-600", fontSize === 'xl' ? 'text-4xl' : 'text-3xl')} style={{ color: "var(--tv-text)" }}>
                                {item.discountPrice!.toLocaleString()}
                                <span className="text-sm font-black ml-1 uppercase opacity-60">so'm</span>
                              </span>
                              <span className="text-lg line-through opacity-25 italic font-medium" style={{ color: "var(--tv-text)" }}>
                                {item.price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <motion.div 
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-100 flex items-center gap-1.5"
                          >
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Narx tushdi!</span>
                          </motion.div>
                        </div>
                      ) : (
                        // ── Regular price ──
                        <span className={cn("font-black", priceSz)} style={{ color: "var(--tv-text)" }}>
                          {item.price.toLocaleString()}
                          <span className="text-xs font-semibold ml-1 opacity-50">so'm</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Color accent top-right corner dot */}
                  <div className={cn(
                    "absolute top-3 right-3 w-2 h-2 rounded-full",
                    item.isNew ? "bg-emerald-400" :
                    isTop ? "bg-amber-400" :
                    isOutOfStock ? "bg-red-300" :
                    hasDiscount ? "bg-red-400" : "bg-gray-200"
                  )} />
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

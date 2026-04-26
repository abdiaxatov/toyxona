"use client";

import React, { useState } from "react";
import { MenuItemComponent } from "@/components/menu-item";
import { ProductDetailDrawer } from "@/components/product-detail-drawer";
import { BannerCarousel } from "@/components/banner-carousel";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import type { MenuItem, Banner } from "@/types";
import { motion } from "framer-motion";

interface MenuGridProps {
  items: MenuItem[];
  banners?: Banner[];
  onBannerClick?: (categoryId: string) => void;
  primaryColor?: string;
  menuGridColumns?: number; // Number of columns per row on mobile
  restaurantId?: string;
  isOrderingEnabled?: boolean;
  isTelegramWebApp?: boolean;
  isTelegramOrderOnly?: boolean;
  onOrderTelegram?: () => void;
}

export const MenuGrid = React.memo(function MenuGrid({ items, banners, onBannerClick, primaryColor, menuGridColumns = 2, restaurantId, isOrderingEnabled = true, isTelegramWebApp, isTelegramOrderOnly, onOrderTelegram }: MenuGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className="text-center py-8 ">
        <p className="text-muted-foreground">{t("menu.noDishesFound")}</p>
      </div>
    );
  }

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;

  const handleNext = () => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % items.length;
    });
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + items.length) % items.length;
    });
  };

  const firstBatch = items.slice(0, 4);
  const restItems = items.slice(4);

  // Grid class mapping for Tailwind CSS (must be complete class names)
  const gridClassMap: Record<number, string> = {
    1: "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3",
    2: "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4",
    3: "grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5",
    4: "grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6",
    5: "grid-cols-5 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6",
    6: "grid-cols-6 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-6",
  };

  // Banner colspan mapping
  const bannerColspanMap: Record<number, string> = {
    1: "col-span-1 sm:col-span-2 md:col-span-2 lg:col-span-3 xl:col-span-3",
    2: "col-span-2 sm:col-span-3 md:col-span-3 lg:col-span-4 xl:col-span-4",
    3: "col-span-3 sm:col-span-4 md:col-span-4 lg:col-span-5 xl:col-span-5",
    4: "col-span-4 sm:col-span-5 md:col-span-5 lg:col-span-6 xl:col-span-6",
    5: "col-span-5 sm:col-span-6 md:col-span-6 lg:col-span-6 xl:col-span-6",
    6: "col-span-6 sm:col-span-6 md:col-span-6 lg:col-span-6 xl:col-span-6",
  };

  const gridClasses = gridClassMap[menuGridColumns] || gridClassMap[2];
  const bannerColspan = bannerColspanMap[menuGridColumns] || bannerColspanMap[2];

  const isCompact = menuGridColumns >= 3;

  return (
    <>
      <motion.div 
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.05 }}
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.06,
              delayChildren: 0.1
            }
          }
        }}
        className={cn(
          "grid p-2 pb-6 menu-grid",
          isCompact ? "gap-2 px-1.5" : "gap-3 px-2",
          gridClasses
        )}
      >
        {items.map((item, index) => (
          <motion.div 
            key={item.id}
            variants={{
              hidden: { opacity: 0, y: 24, scale: 0.94 },
              show: { opacity: 1, y: 0, scale: 1 }
            }}
            transition={{ 
              duration: 0.5, 
              ease: [0.23, 1, 0.32, 1] 
            }}
          >
            <MenuItemComponent
              item={item}
              priority={index < 4}
              onClick={() => setSelectedIndex(index)}
              primaryColor={primaryColor}
              columns={menuGridColumns}
              restaurantId={restaurantId}
              isOrderingEnabled={isOrderingEnabled}
              isTelegramWebApp={isTelegramWebApp}
              isTelegramOrderOnly={isTelegramOrderOnly}
              onOrderTelegram={onOrderTelegram}
            />
          </motion.div>
        ))}
      </motion.div>

      <ProductDetailDrawer
        item={selectedItem}
        isOpen={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        onNext={handleNext}
        onPrev={handlePrev}
        primaryColor={primaryColor}
        restaurantId={restaurantId}
        isOrderingEnabled={isOrderingEnabled}
        isTelegramOrderOnly={isTelegramOrderOnly}
        isTelegramWebApp={isTelegramWebApp}
        onOrderTelegram={onOrderTelegram}
      />
    </>
  );
});

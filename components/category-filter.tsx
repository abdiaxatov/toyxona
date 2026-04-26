"use client";

import { useMemo, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import type { Category } from "@/types";
import { LanguageSwitcher } from "./language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedName } from "@/lib/localization";

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  hasActiveDiscounts?: boolean;
  primaryColor?: string;
  showLanguageSwitcher?: boolean;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  hasActiveDiscounts,
  primaryColor,
  showLanguageSwitcher = true,
}: CategoryFilterProps) {
  const { t, language } = useLanguage();
  const activeCategoryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeCategoryRef.current) {
      activeCategoryRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedCategory]);

  const sortedCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        if (cat.active === false) return false;
        return true;
      })
      .sort((a, b) => {
        const isADiscount = a.isDiscountCategory || getLocalizedName(a, 'uz').toLowerCase() === 'chegirmalar';
        const isBDiscount = b.isDiscountCategory || getLocalizedName(b, 'uz').toLowerCase() === 'chegirmalar';

        if (isADiscount && !isBDiscount) return -1;
        if (!isADiscount && isBDiscount) return 1;

        const orderA = a.order || 0;
        const orderB = b.order || 0;

        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return getLocalizedName(a, language).localeCompare(getLocalizedName(b, language));
      });
  }, [categories, hasActiveDiscounts, language]);

  if (!categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t("common.noCategories")}
          </span>
        </div>
        {showLanguageSwitcher && <LanguageSwitcher variant="outline" className="h-8" />}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-2 pb-4">
            <Button
              ref={selectedCategory === null ? activeCategoryRef : null}
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              className={`rounded-full transition-all duration-300 ${selectedCategory === null
                ? "text-white shadow-md scale-105"
                : "border-primary/20 text-gray-600 hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:scale-105"
                }`}
              style={selectedCategory === null && primaryColor ? { backgroundColor: primaryColor } : undefined}
              onClick={() => onSelectCategory(null)}
            >
              {t("common.all")}
            </Button>

            {sortedCategories.map((category) => {
              const matchesSelected = selectedCategory === category.id;
              const isDiscount = category.isDiscountCategory ||
                getLocalizedName(category, 'uz').toLowerCase() === 'chegirmalar' ||
                getLocalizedName(category, 'ru').toLowerCase() === 'скидки';

              if (isDiscount) {
                return (
                  <Button
                    key={category.id}
                    ref={matchesSelected ? activeCategoryRef : null}
                    variant={matchesSelected ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full transition-all duration-300 relative overflow-hidden ${matchesSelected
                      ? "bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg scale-105 border-0"
                      : "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:scale-105 animate-pulse-subtle"
                      }`}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <span className="flex items-center gap-1">
                      <span className="text-sm">🔥</span>
                      {getLocalizedName(category, language)}
                    </span>
                    {matchesSelected && (
                      <span className="absolute inset-0 bg-white/20 animate-shine" />
                    )}
                  </Button>
                );
              }

              return (
                <Button
                  key={category.id}
                  ref={matchesSelected ? activeCategoryRef : null}
                  variant={matchesSelected ? "default" : "outline"}
                  size="sm"
                  className={`rounded-full transition-all duration-300 ${matchesSelected
                    ? "text-white shadow-md scale-105"
                    : "border-primary/20 text-gray-600 hover:bg-primary/10 hover:text-primary hover:border-primary/50 hover:scale-105"
                    }`}
                  style={matchesSelected && primaryColor ? { backgroundColor: primaryColor } : undefined}
                  onClick={() => onSelectCategory(category.id)}
                >
                  {getLocalizedName(category, language)}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <div className="pb-4">
        {showLanguageSwitcher && <LanguageSwitcher variant="outline" className="h-9 shadow-sm border-primary/20" />}
      </div>
    </div>
  );
}


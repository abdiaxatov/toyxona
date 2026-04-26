"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const { t } = useLanguage();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <div className="relative group">
      <div className="relative overflow-hidden rounded-[22px] bg-white/5 dark:bg-black/10 backdrop-blur-xl border border-white/10 shadow-lg transition-all focus-within:ring-2 focus-within:ring-primary/30">
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
        <Input
          type="text"
          placeholder={t("menu.searchPlaceholder")}
          className="h-14 pl-12 pr-12 bg-transparent border-0 text-base font-medium placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={query}
          onChange={handleChange}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground transition-all active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

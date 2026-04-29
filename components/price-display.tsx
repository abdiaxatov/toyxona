import { formatNumber, cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface PriceDisplayProps {
    price: number;
    discountPrice?: number;
    className?: string;
    primaryColor?: string;
    isCompact?: boolean;
    columns?: number;
}

export function PriceDisplay({ price, discountPrice, className, primaryColor, isCompact, columns = 2 }: PriceDisplayProps) {
    const { language } = useLanguage();
    const hasDiscount = discountPrice && discountPrice > 0 && discountPrice < price;

    const isDense = columns >= 4;
    const finalSizeClass = isDense ? "text-[10px]" : isCompact ? "text-xs" : "text-lg";
    const currencySizeClass = isDense ? "text-[7px]" : "text-[0.6em]";

    // Helper to get currency suffix without built-in spacing
    const currencySuffix = "$";

    if (!hasDiscount) {
        return (
            <div
                className={cn("flex items-baseline font-black text-primary whitespace-nowrap overflow-hidden", finalSizeClass, className)}
                style={primaryColor ? { color: primaryColor } : undefined}
            >
                <span className="tracking-tight">{formatNumber(price)}</span>
                <span className={cn("ml-1 font-black text-slate-400 uppercase tracking-tighter shrink-0 mb-0.5", currencySizeClass)}>
                    {currencySuffix}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis flex-wrap", className)}>
            <div className="flex flex-col items-start leading-none gap-0 overflow-hidden">
                <div className={cn(
                    "flex items-baseline text-gray-400 line-through decoration-red-500/80 decoration-[1.5px] -rotate-2 origin-left scale-90 opacity-80 whitespace-nowrap",
                    isDense ? "text-[8px]" : "text-[10px]"
                )}>
                    <span>{formatNumber(price)}</span>
                    <span className="ml-0.5 text-[0.7em] uppercase">{currencySuffix}</span>
                </div>
                <div className={cn("flex items-baseline font-black text-red-600 tracking-tighter whitespace-nowrap overflow-hidden", finalSizeClass)}>
                    <span className="">{formatNumber(discountPrice)}</span>
                    <span className={cn("ml-1 font-black uppercase text-slate-400 tracking-tighter shrink-0 mb-0.5", currencySizeClass)}>
                        {currencySuffix}
                    </span>
                </div>
            </div>
            <div className={cn(
                "bg-red-600 text-white font-black rounded-md shadow-sm shadow-red-200 animate-in zoom-in duration-300 shrink-0 self-end mb-0.5",
                isDense ? "text-[7px] px-1 py-0.2" : "text-[10px] px-1.5 py-0.5"
            )}>
                -{Math.round((1 - discountPrice / price) * 100)}%
            </div>
        </div>
    );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-col min-h-screen pb-20 bg-background">

            {/* 1. Header Skeleton - Sony UI Style */}
            <div className="relative w-full h-[280px] md:h-[350px] bg-muted overflow-hidden shadow-2xl mb-6 rounded-b-[40px] shrink-0">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />

                {/* Logo Circle */}
                <div className="absolute top-6 left-6 z-20">
                    <Skeleton className="w-[88px] h-[88px] rounded-full ring-4 ring-background/20" />
                </div>

                {/* Text Content */}
                <div className="absolute bottom-8 left-6 z-20 space-y-4 w-2/3">
                    <Skeleton className="h-10 w-3/4 rounded-xl" />
                    <Skeleton className="h-5 w-1/2 rounded-lg opacity-70" />
                </div>

                {/* Social Icons */}
                <div className="absolute bottom-8 right-6 z-20 flex flex-col gap-3">
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <Skeleton className="w-11 h-11 rounded-full" />
                </div>
            </div>

            <div className="px-4 space-y-8 flex-1">

                {/* 2. Action Buttons (Grid) */}
                <div className="grid grid-cols-2 gap-4 -mt-14 relative z-30 px-2">
                    <Skeleton className="h-24 rounded-[24px] shadow-lg" />
                    <Skeleton className="h-24 rounded-[24px] shadow-lg" />
                </div>

                {/* 3. Search & Tabs */}
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <div className="flex gap-2 overflow-hidden">
                        <Skeleton className="h-10 w-24 rounded-full shrink-0" />
                        <Skeleton className="h-10 w-24 rounded-full shrink-0" />
                        <Skeleton className="h-10 w-24 rounded-full shrink-0" />
                    </div>
                </div>

                {/* 4. Menu Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 pb-20">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-3">
                            <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
                            <div className="space-y-2 px-1">
                                <Skeleton className="h-4 w-3/4 rounded-md" />
                                <Skeleton className="h-4 w-1/2 rounded-md opacity-60" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

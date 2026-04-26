"use client"

import React, { useState, forwardRef, useEffect, useRef } from "react"
import HTMLFlipBook from "react-pageflip"
import Image from "next/image"
import { MenuItem, Category } from "@/types"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/hooks/use-language"
import { getLocalizedName, getLocalizedDescription } from "@/lib/localization"
import { Search, ChevronRight, ChevronLeft, MapPin, Phone, Send } from "lucide-react"

interface BookMenuProps {
    items: MenuItem[]
    categories: Category[]
    restaurantData: any
    className?: string
}

// 📖 Page Component (Must be forwardRef for react-pageflip)
const Page = forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div className={cn("page bg-[#fffbf0] h-full shadow-inner", props.className)} ref={ref}>
            <div className="h-full border-r border-[#eaddcf] relative overflow-hidden">
                {/* Vintage Paper Texture */}
                <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply bg-repeat"
                    style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}></div>

                {/* Inner Content */}
                <div className="relative z-10 h-full flex flex-col p-4 md:p-8">
                    {props.children}
                </div>

                {/* Page Number */}
                <div className="absolute bottom-4 right-6 text-[#a1887f] text-xs font-serif font-bold z-20">
                    {props.number}
                </div>
            </div>
        </div>
    )
})
Page.displayName = "Page"

const CoverPage = forwardRef<HTMLDivElement, any>((props, ref) => {
    return (
        <div className="page bg-[#3e2723] h-full text-[#eaddcf] shadow-2xl border-r-4 border-[#25150e] relative overflow-hidden" ref={ref}>
            {/* Leather Texture */}
            <div className="absolute inset-0 opacity-30 pointer-events-none bg-repeat"
                style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>

            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center border-4 border-[#5d4037] m-4 rounded-lg">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border-8 border-[#d4af37] shadow-[0_0_60px_rgba(212,175,55,0.4)] overflow-hidden mb-12 bg-white relative animate-in fade-in zoom-in duration-1000">
                    <Image
                        src={props.logo || "/Logo.png"}
                        alt="Logo"
                        fill
                        className="object-cover p-2"
                    />
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-[0.15em] uppercase text-[#d4af37] drop-shadow-2xl mb-6 font-serif">
                    {props.name}
                </h1>

                <p className="text-sm md:text-base text-[#bcaaa4] tracking-[0.2em] uppercase font-sans border-t border-b border-[#d4af37] py-2 px-8">
                    {props.slogan || "Exclusive Menu"}
                </p>

                <div className="mt-12 space-y-3 text-[#a1887f] text-sm font-serif italic border-t border-[#5d4037]/30 pt-6 px-10">
                    <div className="flex items-center gap-2 justify-center opacity-70">
                        <MapPin className="w-4 h-4 text-[#d4af37]" /> <span>Toshkent, O'zbekiston</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center opacity-70">
                        <Phone className="w-4 h-4 text-[#d4af37]" /> <span>Premium Hospitality</span>
                    </div>
                    <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-[#d4af37]/50">
                        Est. 2025
                    </div>
                </div>
            </div>
        </div>
    )
})
CoverPage.displayName = "CoverPage"

export function BookMenu(props: BookMenuProps) {
    const { items, categories, restaurantData, className } = props
    const { language, t } = useLanguage()
    const bookRef = useRef<any>(null)
    const [pageCount, setPageCount] = useState(0)

    // Group items by category
    const itemsByCategory = categories.map(category => ({
        ...category,
        items: items.filter(item => item.categoryId === category.id)
    })).filter(cat => cat.items.length > 0) // Only show categories with items

    // Responsive dimensions
    const [dimensions, setDimensions] = useState({ width: 450, height: 650 })

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            const height = window.innerHeight

            if (width < 768) {
                // Mobile: 90% of screen for comfortable viewing
                setDimensions({
                    width: width * 0.9,
                    height: height * 0.9
                })
            } else {
                // Desktop: Moderate size - comfortable reading dimensions
                const targetHeight = height * 0.75 // 75% of screen height
                const targetWidth = Math.min(500, width * 0.35) // Max 500px or 35% of width

                setDimensions({
                    width: targetWidth,
                    height: targetHeight
                })
            }
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className={cn("fixed inset-0 z-50 bg-[#1a0f0a] flex flex-col items-center justify-center overflow-hidden", className)}>

            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-50"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none"></div>

            {/* Booking Wrapper */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
                {/* @ts-ignore - react-pageflip types are sometimes tricky */}
                <HTMLFlipBook
                    key={`book-${itemsByCategory.length}-${dimensions.width}`}
                    width={dimensions.width}
                    height={dimensions.height}
                    size="stretch"
                    minWidth={300}
                    maxWidth={2000}
                    minHeight={400}
                    maxHeight={2500}
                    maxShadowOpacity={0.5}
                    showCover={true}
                    mobileScrollSupport={true}
                    className="demo-book"
                    ref={bookRef}
                    onFlip={(e: any) => setPageCount(e.data)}
                >
                    {[
                        /* Cover Page */
                        <CoverPage key="cover" name={restaurantData.name} logo={restaurantData.logoUrl} slogan={restaurantData.slogan} />,

                        /* Image-based pages (if any) */
                        ...(restaurantData.scanMenuUrls && restaurantData.scanMenuUrls.length > 0
                            ? restaurantData.scanMenuUrls.map((url: string, index: number) => (
                                <Page key={`img-page-${index}`} number={index + 1}>
                                    <div className="h-full relative overflow-hidden flex items-center justify-center p-0">
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={url}
                                                alt={`Page ${index + 1}`}
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768) 100vw, 50vw"
                                            />
                                        </div>
                                    </div>
                                </Page>
                            ))
                            : []),

                        /* Table of Contents (only if no scanned images) */
                        ...((!restaurantData.scanMenuUrls || restaurantData.scanMenuUrls.length === 0)
                            ? [
                                <Page key="toc" number={1}>
                                    <div className="h-full flex flex-col pt-4">
                                        <h2 className="text-3xl md:text-4xl font-bold text-[#3e2723] text-center mb-8 italic border-b-4 border-double border-[#d4af37] pb-4 inline-block mx-auto font-serif tracking-wide">
                                            Mundarija
                                        </h2>
                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            <div className="space-y-4">
                                                {itemsByCategory.map((category, index) => (
                                                    <div
                                                        key={category.id}
                                                        onClick={() => bookRef.current?.pageFlip().turnToPage(index + 2)}
                                                        className="flex items-baseline justify-between border-b border-dotted border-[#a1887f]/50 pb-3 cursor-pointer hover:text-[#d4af37] hover:border-[#d4af37] transition-all group"
                                                    >
                                                        <span className="text-xl md:text-2xl font-bold text-[#5d4037] group-hover:text-[#8b5a2b] font-serif uppercase tracking-wider pl-2">
                                                            {category.name}
                                                        </span>
                                                        <span className="italic text-[#a1887f] text-sm md:text-base font-serif pr-2">Sahifa {index + 3}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-6 text-center">
                                            <span className="text-2xl text-[#d4af37]">❦</span>
                                        </div>
                                    </div>
                                </Page>,
                                /* Category Pages */
                                ...itemsByCategory.map((category, index) => (
                                    <Page key={category.id} number={index + 2}>
                                        <div className="h-full flex flex-col">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-2xl font-bold text-[#3e2723] bg-[#fffbf0] pr-4 italic font-serif border-l-4 border-[#d4af37] pl-3">
                                                    {category.name}
                                                </h3>
                                                <span className="text-[#d7ccc8] opacity-50 text-2xl">
                                                    {((index + 2) % 2 === 0) ? '✤' : '❦'}
                                                </span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
                                                <div className="space-y-6 sm:space-y-8 pb-8 px-1">
                                                    {category.items.map((item) => (
                                                        <div key={item.id} className="flex gap-4 sm:gap-6 group items-start relative">
                                                            <div className="absolute left-10 top-16 bottom-0 w-px border-l border-dashed border-[#d7ccc8] last:hidden z-0"></div>
                                                            {item.imageUrl && (
                                                                <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 relative rounded-sm overflow-hidden border-[3px] border-white shadow-lg rotate-2 group-hover:rotate-0 transition-transform duration-500 z-10 bg-gray-100">
                                                                    <Image
                                                                        src={item.imageUrl}
                                                                        alt={item.name}
                                                                        fill
                                                                        className="object-cover sepia-[.15] group-hover:sepia-0 transition-all duration-500"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0 pt-1 z-10">
                                                                <div className="flex justify-between items-baseline border-b-2 border-dotted border-[#a1887f]/40 mb-2 pb-1 relative">
                                                                    <h4 className="font-bold text-[#3e2723] text-xl sm:text-2xl md:text-3xl leading-tight font-serif tracking-tight group-hover:text-[#8b5a2b] transition-colors">
                                                                        {getLocalizedName(item, language)}
                                                                    </h4>
                                                                    <span className="font-bold text-[#bcaaa4] mx-1 mb-1 text-xs">.....</span>
                                                                    <span className="font-bold text-[#8b5a2b] text-xl sm:text-2xl md:text-3xl font-serif whitespace-nowrap bg-[#fffbf0] pl-1">
                                                                        {item.price.toLocaleString()}
                                                                    </span>
                                                                </div>

                                                                {/* 📖 Book Menu Variants */}
                                                                {item.variants && item.variants.length > 0 && (
                                                                    <div className="mb-3 space-y-1 pl-4 border-l border-[#d4af37]/30">
                                                                        {item.variants.map((v) => (
                                                                            <div key={v.id} className="flex justify-between items-center text-sm sm:text-base">
                                                                                <span className="text-[#5d4037]/70 italic font-serif">
                                                                                    {getLocalizedName(v, language)}
                                                                                </span>
                                                                                <span className="font-bold text-[#8b5a2b] font-serif">
                                                                                    {v.price.toLocaleString()}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <p className="text-base sm:text-lg text-[#5d4037]/80 italic line-clamp-4 leading-relaxed font-serif">
                                                                    {getLocalizedDescription(item, language)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </Page>
                                ))
                            ]
                            : []),

                        /* Back Cover */
                        <Page key="back-cover" number={(restaurantData.scanMenuUrls?.length || (itemsByCategory.length + 1)) + 1} className="bg-[#3e2723] border-l-4 border-[#25150e]">
                            <div className="absolute inset-0 opacity-30 pointer-events-none bg-repeat"
                                style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>
                            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center">
                                <h3 className="text-3xl font-serif text-[#d4af37] mb-2">{restaurantData.name}</h3>
                                <div className="w-12 h-px bg-[#d4af37]/30 mb-4" />
                                <p className="text-sm text-[#a1887f] tracking-widest uppercase">Tashkent 2025</p>
                            </div>
                        </Page>
                    ].filter(Boolean)}
                </HTMLFlipBook>
            </div>

            {/* Mobile Navigation Hints */}
            {/* Mobile Navigation Hints - HIDDEN as requested */}
            {/* <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-white/50 z-20 pointer-events-none md:hidden animate-pulse">
                <div className="flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Oldingi</div>
                <div className="flex items-center gap-1">Keyingi <ChevronRight className="w-4 h-4" /></div>
            </div> */}
        </div>
    )
}

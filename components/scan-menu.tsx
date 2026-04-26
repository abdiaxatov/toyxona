"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ScanMenuProps {
    urls: string[]
    restaurantName: string
    className?: string
}

export function ScanMenu({ urls, restaurantName, className }: ScanMenuProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [touchStart, setTouchStart] = useState(0)
    const [touchEnd, setTouchEnd] = useState(0)

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrevious()
            if (e.key === "ArrowRight") handleNext()
            if (e.key === "Escape") setIsFullscreen(false)
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [currentIndex, urls.length])

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % urls.length)
        setZoom(1)
    }

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length)
        setZoom(1)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > 50
        const isRightSwipe = distance < -50

        if (isLeftSwipe) handleNext()
        if (isRightSwipe) handlePrevious()

        setTouchStart(0)
        setTouchEnd(0)
    }

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.5, 3))
    }

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.5, 1))
    }

    if (!urls || urls.length === 0) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                    <div className="w-24 h-24 mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white/90">Menyu rasmlari yuklanmagan</h2>
                    <p className="text-white/60">Admin paneldan menyu rasmlarini yuklang</p>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("fixed inset-0 bg-black overflow-hidden", className)}>
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-95" />

            {/* Header */}
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-md"
            >
                <div className="px-4 py-6 md:px-8 md:py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/20">
                                <span className="text-2xl md:text-3xl font-bold text-gray-900">📖</span>
                            </div>
                            <div>
                                <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">
                                    {restaurantName}
                                </h1>
                                <p className="text-sm md:text-base text-white/60 font-medium">Menyu</p>
                            </div>
                        </div>

                        {/* Page Counter */}
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-full border border-white/20 shadow-xl">
                            <span className="text-white font-bold text-sm md:text-lg">
                                {currentIndex + 1} / {urls.length}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Image Container */}
            <div className="absolute inset-0 flex items-center justify-center px-4 md:px-16 py-24 md:py-32">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="relative w-full h-full max-w-5xl"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Image Card */}
                        <div className="relative w-full h-full bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
                            {/* Decorative Border */}
                            <div className="absolute inset-0 border-8 md:border-12 border-white/10 rounded-2xl md:rounded-3xl pointer-events-none z-10" />

                            {/* Image */}
                            <div
                                className="relative w-full h-full overflow-auto"
                                style={{
                                    cursor: zoom > 1 ? 'grab' : 'default'
                                }}
                            >
                                <div
                                    className="min-w-full min-h-full flex items-center justify-center p-4 md:p-8"
                                    style={{
                                        transform: `scale(${zoom})`,
                                        transition: 'transform 0.3s ease-out'
                                    }}
                                >
                                    <Image
                                        src={urls[currentIndex]}
                                        alt={`Menu page ${currentIndex + 1}`}
                                        width={1200}
                                        height={1600}
                                        className="object-contain w-full h-full"
                                        priority={currentIndex === 0}
                                        quality={95}
                                    />
                                </div>
                            </div>

                            {/* Image Description Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 md:p-8">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-center"
                                >
                                    <h3 className="text-lg md:text-2xl font-bold text-white mb-2">
                                        Sahifa {currentIndex + 1}
                                    </h3>
                                    <p className="text-sm md:text-base text-white/80">
                                        Menyu rasmini ko'rish uchun chapga yoki o'ngga suring
                                    </p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            {urls.length > 1 && (
                <>
                    {/* Previous Button */}
                    <motion.button
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        onClick={handlePrevious}
                        className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 md:p-4 rounded-full shadow-2xl border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 group"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 group-hover:-translate-x-1 transition-transform" />
                    </motion.button>

                    {/* Next Button */}
                    <motion.button
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        onClick={handleNext}
                        className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 md:p-4 rounded-full shadow-2xl border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 group"
                        aria-label="Next page"
                    >
                        <ChevronRight className="w-6 h-6 md:w-8 md:h-8 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </>
            )}

            {/* Bottom Controls */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-md"
            >
                <div className="px-4 py-6 md:px-8 md:py-8">
                    {/* Zoom Controls */}
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <button
                            onClick={handleZoomOut}
                            disabled={zoom <= 1}
                            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 md:p-3 rounded-full shadow-lg border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95"
                            aria-label="Zoom out"
                        >
                            <ZoomOut className="w-5 h-5 md:w-6 md:h-6" />
                        </button>

                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                            <span className="text-white font-semibold text-sm md:text-base">
                                {Math.round(zoom * 100)}%
                            </span>
                        </div>

                        <button
                            onClick={handleZoomIn}
                            disabled={zoom >= 3}
                            className="bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 md:p-3 rounded-full shadow-lg border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95"
                            aria-label="Zoom in"
                        >
                            <ZoomIn className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    {/* Thumbnail Navigation */}
                    {urls.length > 1 && (
                        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
                            {urls.map((url, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setCurrentIndex(index)
                                        setZoom(1)
                                    }}
                                    className={cn(
                                        "relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-110",
                                        currentIndex === index
                                            ? "border-white shadow-2xl ring-4 ring-white/30 scale-110"
                                            : "border-white/30 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <Image
                                        src={url}
                                        alt={`Thumbnail ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                    />
                                    {currentIndex === index && (
                                        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Progress Indicator */}
            <div className="absolute top-20 md:top-24 left-0 right-0 z-10 px-4 md:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentIndex + 1) / urls.length) * 100}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </div>

            {/* Swipe Hint (Mobile) */}
            {urls.length > 1 && (
                <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ delay: 3, duration: 1 }}
                    className="absolute bottom-32 left-0 right-0 z-10 flex justify-center md:hidden pointer-events-none"
                >
                    <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
                        <p className="text-white/80 text-sm font-medium flex items-center gap-2">
                            <ChevronLeft className="w-4 h-4 animate-pulse" />
                            Suring
                            <ChevronRight className="w-4 h-4 animate-pulse" />
                        </p>
                    </div>
                </motion.div>
            )}
        </div>
    )
}

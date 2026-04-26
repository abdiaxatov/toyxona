"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, Plus, Settings2, Eye, Grid2X2, ListOrdered, ChevronRight, ChevronLeft, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"
import { getLocalizedName } from "@/lib/localization"
import { MenuItem, Category } from "@/types"
import { BookMenu } from "@/components/book-menu"
import Image from "next/image"

interface BookMenuAdminProps {
    items: MenuItem[]
    categories: Category[]
    restaurant: any
    onAddItem: () => void
    onEditItem: (item: MenuItem) => void
    onDeleteItem: (item: MenuItem) => void
    onAddCategory: () => void
}

export function BookMenuAdmin({
    items,
    categories,
    restaurant,
    onAddItem,
    onEditItem,
    onDeleteItem,
    onAddCategory
}: BookMenuAdminProps) {
    const { language, t } = useLanguage()
    const [viewMode, setViewMode] = useState<"visual" | "structure">("visual")
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        categories.length > 0 ? categories[0].id : null
    )

    const filteredItems = useMemo(() => {
        if (!selectedCategoryId) return []
        return items.filter(item => item.categoryId === selectedCategoryId)
    }, [items, selectedCategoryId])

    const selectedCategory = useMemo(() => {
        return categories.find(c => c.id === selectedCategoryId)
    }, [categories, selectedCategoryId])

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border">
                <div>
                    <h2 className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6" />
                        Kitob Menyu Boshqaruvi
                    </h2>
                    <CardDescription>
                        Menyungizni kitob ko'rinishida boshqaring va sahifalarni tartibga soling.
                    </CardDescription>
                </div>

                <div className="flex items-center bg-amber-50 p-1 rounded-xl border border-amber-100">
                    <Button
                        variant={viewMode === "visual" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("visual")}
                        className={`rounded-lg gap-2 ${viewMode === "visual" ? "bg-amber-600 hover:bg-amber-700 shadow-sm" : "text-amber-800"}`}
                    >
                        <Eye className="w-4 h-4" />
                        Vizual Ko'rinish
                    </Button>
                    <Button
                        variant={viewMode === "structure" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("structure")}
                        className={`rounded-lg gap-2 ${viewMode === "structure" ? "bg-amber-600 hover:bg-amber-700 shadow-sm" : "text-amber-800"}`}
                    >
                        <ListOrdered className="w-4 h-4" />
                        Sahifalar Tuzilishi
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Pages / Categories Navigation */}
                <div className="lg:col-span-3 space-y-4">
                    <Card className="border-amber-100">
                        <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-800">
                                Sahifalar (Kategoriyalar)
                            </CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={onAddCategory}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <ScrollArea className="h-[500px] px-2 pb-4">
                            <div className="space-y-1">
                                {categories.map((category, index) => (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategoryId(category.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${selectedCategoryId === category.id
                                            ? "bg-amber-600 text-white shadow-md active:scale-95"
                                            : "hover:bg-amber-50 text-amber-900 border border-transparent hover:border-amber-100"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${selectedCategoryId === category.id ? "border-white bg-white/20" : "border-amber-200 bg-amber-100 text-amber-700"
                                                }`}>
                                                {index + 1}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="font-bold truncate max-w-[120px] leading-tight text-sm">
                                                    {getLocalizedName(category, language)}
                                                </span>
                                                <span className={`text-[9px] uppercase tracking-tighter ${selectedCategoryId === category.id ? "text-amber-100" : "text-amber-500"}`}>
                                                    {items.filter(i => i.categoryId === category.id).length} ta mahsulot
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedCategoryId === category.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100"}`} />
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t border-amber-50">
                            <Button variant="outline" className="w-full border-dashed border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-xl" onClick={onAddCategory}>
                                <Plus className="w-4 h-4 mr-2" />
                                Yangi Sahifa
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-9">
                    <AnimatePresence mode="wait">
                        {viewMode === "visual" ? (
                            <motion.div
                                key="visual"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <Card className="overflow-hidden border-2 border-amber-900/20 shadow-2xl bg-[#1a0f0a] relative ring-8 ring-amber-900/5">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-30 pointer-events-none"></div>
                                    <div className="bg-amber-950/40 p-4 text-center text-[10px] font-bold text-amber-200 uppercase tracking-[0.4em] border-b border-white/5 backdrop-blur-sm relative z-20">
                                        Mijozlar Ko'radigan Jonli Ko'rinish
                                    </div>
                                    <div className="h-[750px] relative z-10 flex items-center justify-center">
                                        <div className="scale-[0.7] md:scale-[0.85] lg:scale-[0.9] origin-center w-full h-full flex items-center justify-center">
                                            <BookMenu
                                                items={items}
                                                categories={categories}
                                                restaurantData={restaurant}
                                            />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                                        <div className="bg-black/40 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 text-white text-[10px] uppercase tracking-[0.2em] font-black shadow-2xl animate-bounce">
                                            Varaqlash uchun chetdan torting
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="structure"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                {selectedCategory ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-2xl font-bold text-amber-950 flex items-center gap-3">
                                                    {getLocalizedName(selectedCategory, language)}
                                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px]">
                                                        {filteredItems.length} ta taom
                                                    </Badge>
                                                </h3>
                                                <p className="text-amber-700/60 text-sm mt-1">Bu sahifaga yangi taomlar qo'shishingiz va mavjudlarini tahrirlashingiz mumkin.</p>
                                            </div>
                                            <Button
                                                onClick={onAddItem}
                                                className="bg-amber-600 hover:bg-amber-700 shadow-lg text-white rounded-xl"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Taom Qo'shish
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {filteredItems.map((item) => (
                                                <Card key={item.id} className="group hover:border-amber-300 transition-all hover:shadow-lg overflow-hidden border-amber-100">
                                                    <CardContent className="p-0 flex h-28">
                                                        <div className="relative w-28 h-full overflow-hidden bg-amber-50">
                                                            {item.imageUrl ? (
                                                                <Image
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    fill
                                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-amber-200">
                                                                    <BookOpen className="w-8 h-8" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 p-4 flex flex-col justify-between">
                                                            <div>
                                                                <div className="flex justify-between items-start">
                                                                    <h4 className="font-bold text-amber-900 group-hover:text-amber-700 transition-colors">
                                                                        {getLocalizedName(item, language)}
                                                                    </h4>
                                                                    <span className="text-amber-600 font-bold text-sm">
                                                                        {item.price.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-amber-700/50 line-clamp-2 mt-1 italic font-serif">
                                                                    {getLocalizedName(item, language)} - {item.categoryId}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-lg"
                                                                    onClick={() => onEditItem(item)}
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                                                                    onClick={() => onDeleteItem(item)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}

                                            <button
                                                onClick={onAddItem}
                                                className="h-28 border-2 border-dashed border-amber-200 rounded-xl flex flex-col items-center justify-center text-amber-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all group"
                                            >
                                                <Plus className="w-8 h-8 mb-1 group-hover:scale-110 transition-transform" />
                                                <span className="text-sm font-medium">Yangi Taom</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[400px] flex flex-col items-center justify-center text-amber-200 p-12 border-2 border-dashed border-amber-100 rounded-3xl bg-amber-50/20">
                                        <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="text-amber-800/40 font-medium">Sahifa tanlanmagan</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

"use client"

import React, { useState } from "react"
import { Camera, Upload, Trash2, Loader2, Image as ImageIcon, Plus, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { uploadToGitHub } from "@/lib/github-upload"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ScanMenuAdminProps {
    restaurant: any
    isBookStyle?: boolean
}

export function ScanMenuAdmin({ restaurant, isBookStyle }: ScanMenuAdminProps) {
    const [uploading, setUploading] = useState(false)
    const scanMenuUrls = restaurant?.scanMenuUrls || []

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setUploading(true)
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const result = await uploadToGitHub(file, `${Date.now()}-${file.name}`, "scans")
                return result.success ? result.url : null
            })

            const urls = await Promise.all(uploadPromises)
            const successfulUrls = urls.filter((url): url is string => url !== null)

            const newUrls = [...scanMenuUrls, ...successfulUrls]
            await updateDoc(doc(db, "restaurants", restaurant.id), {
                scanMenuUrls: newUrls
            })
            toast.success(`${successfulUrls.length} ta yangi sahifa qo'shildi`)
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("Rasmlarni yuklashda xatolik!")
        } finally {
            setUploading(false)
        }
    }

    const removeImage = async (index: number) => {
        try {
            const newUrls = [...scanMenuUrls]
            newUrls.splice(index, 1)
            await updateDoc(doc(db, "restaurants", restaurant.id), {
                scanMenuUrls: newUrls
            })
            toast.success("Sahifa o'chirildi")
        } catch (error) {
            toast.error("Xatolik yuz berdi")
        }
    }

    return (
        <div className="space-y-8">
            {/* Upload Section */}
            <Card className={`border-none shadow-xl ${isBookStyle ? 'bg-gradient-to-br from-amber-50 to-orange-50' : 'bg-gradient-to-br from-purple-50 to-indigo-50'} overflow-hidden relative`}>
                <div className={`absolute inset-0 ${isBookStyle ? 'bg-amber-500/5' : 'bg-purple-500/5'} backdrop-blur-3xl`}></div>
                <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col items-center text-center space-y-6">
                        {/* Icon */}
                        <div className={`w-24 h-24 ${isBookStyle ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-purple-500 to-indigo-600'} rounded-3xl flex items-center justify-center shadow-2xl ${isBookStyle ? 'shadow-amber-500/30' : 'shadow-purple-500/30'} transform hover:scale-110 transition-transform duration-300`}>
                            {isBookStyle ? <BookOpen className="w-12 h-12 text-white" /> : <Camera className="w-12 h-12 text-white" />}
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-3 max-w-2xl">
                            <h3 className={`text-2xl font-bold ${isBookStyle ? 'text-amber-900' : 'text-purple-900'}`}>
                                {isBookStyle ? "Kitob Menyu Sahifalari" : "Qog'oz Menyu Skaneri"}
                            </h3>
                            <p className={`text-sm ${isBookStyle ? 'text-amber-700/70' : 'text-purple-700/70'} leading-relaxed`}>
                                {isBookStyle
                                    ? "Tayyor menyu sahifalarini yuklang va mijozlaringiz uchun ajoyib kitob ko'rinishini yarating."
                                    : "Qog'oz menyuingizni rasmga olib yuklang. Mijozlar uni zamonaviy galeriya ko'rinishida ko'radilar."}
                            </p>
                        </div>

                        {/* Upload Button */}
                        <div className="relative pt-2">
                            <Input
                                type="file"
                                multiple
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                            <Button
                                disabled={uploading}
                                className={`${isBookStyle ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/30'} text-white rounded-2xl gap-3 h-14 px-10 shadow-2xl font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95`}
                            >
                                {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                {uploading ? "Yuklanmoqda..." : "Sahifalarni Yuklash"}
                            </Button>
                        </div>

                        {/* Stats */}
                        {scanMenuUrls.length > 0 && (
                            <div className={`flex items-center gap-2 px-4 py-2 ${isBookStyle ? 'bg-amber-100/50' : 'bg-purple-100/50'} rounded-full`}>
                                <div className={`w-2 h-2 rounded-full ${isBookStyle ? 'bg-amber-500' : 'bg-purple-500'} animate-pulse`}></div>
                                <span className={`text-sm font-semibold ${isBookStyle ? 'text-amber-800' : 'text-purple-800'}`}>
                                    {scanMenuUrls.length} ta sahifa yuklangan
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Gallery Section */}
            {scanMenuUrls.length > 0 ? (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h4 className={`text-lg font-bold ${isBookStyle ? 'text-amber-900' : 'text-purple-900'}`}>
                            Menyu Sahifalari
                        </h4>
                        <div className={`h-px flex-1 ${isBookStyle ? 'bg-amber-200' : 'bg-purple-200'}`}></div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {scanMenuUrls.map((url: string, index: number) => (
                            <div
                                key={index}
                                className="group relative aspect-[3/4] rounded-2xl overflow-hidden border-4 border-white shadow-2xl transition-all duration-300 hover:scale-105 hover:-rotate-1 hover:shadow-3xl"
                            >
                                <img src={url} className="w-full h-full object-cover" alt={`Page ${index + 1}`} />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="rounded-full h-12 w-12 shadow-2xl transform scale-0 group-hover:scale-100 transition-transform duration-300"
                                        onClick={() => removeImage(index)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Page Number Badge */}
                                <div className={`absolute top-3 left-3 px-3 py-1.5 ${isBookStyle ? 'bg-amber-600' : 'bg-purple-600'} backdrop-blur-md rounded-xl text-white text-xs font-bold shadow-lg`}>
                                    {index + 1}
                                </div>
                            </div>
                        ))}

                        {/* Add New Card */}
                        <label className={`relative aspect-[3/4] rounded-2xl border-3 border-dashed ${isBookStyle ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50' : 'border-purple-200 bg-purple-50/30 hover:border-purple-400 hover:bg-purple-50'} flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 hover:scale-105 ${isBookStyle ? 'text-amber-400 hover:text-amber-600' : 'text-purple-400 hover:text-purple-600'}`}>
                            <Input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                            <div className={`p-4 ${isBookStyle ? 'bg-amber-100' : 'bg-purple-100'} rounded-2xl shadow-lg`}>
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">Yangi Sahifa</span>
                            {uploading && <Loader2 className="w-5 h-5 animate-spin absolute" />}
                        </label>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                    <div className="relative">
                        <ImageIcon className="w-24 h-24 mb-6 opacity-20" />
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/50 blur-2xl"></div>
                    </div>
                    <p className="font-semibold text-lg italic">Hali birorta ham sahifa yuklanmagan</p>
                    <p className="text-sm mt-2 text-gray-400">Yuqoridagi tugmadan foydalanib sahifalarni yuklang</p>
                </div>
            )}
        </div>
    )
}

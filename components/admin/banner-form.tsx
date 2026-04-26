"use client"

import { useState, useRef, useEffect } from "react"
import { collection, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getRestaurantCollection, getRestaurantDoc } from "@/lib/firebase-utils"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ImageIcon, Upload, X, ChevronLeft, LayoutGrid, MousePointer2, Info, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Banner, Category } from "@/types"
import { uploadToGitHub } from "@/lib/github-upload"
import Image from "next/image"
import { useLanguage } from "@/hooks/use-language"

interface BannerFormProps {
    banner?: Banner | null
    categories: Category[]
    onSuccess?: () => void
    onCancel?: () => void
}

export function BannerForm({ banner, categories, onSuccess, onCancel }: BannerFormProps) {
    const [formData, setFormData] = useState({
        name: banner?.name || "",
        name_uz: banner?.name_uz || "",
        name_ru: banner?.name_ru || "",
        name_en: banner?.name_en || "",
        imageUrl: banner?.imageUrl || "",
        categoryId: banner?.categoryId || "all", // "all" for general banner
        displayAfterCategoryId: banner?.displayAfterCategoryId || "all", // "all" for general placement
        active: banner?.active !== false,
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isImageValid, setIsImageValid] = useState(false)
    const [isCheckingImage, setIsCheckingImage] = useState(false)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [showImagePreview, setShowImagePreview] = useState(false)

    const { toast } = useToast()
    const { t, language } = useLanguage()
    const { restaurantId } = useAuth()
    const imageInputRef = useRef<HTMLInputElement>(null)

    const [imageFileName, setImageFileName] = useState(t("admin.form.fileNotSelected"))

    // Check image validity when imageUrl changes
    useEffect(() => {
        if (formData.imageUrl) {
            setIsCheckingImage(true)
            setIsImageValid(false)
            const img = new window.Image()
            img.onload = () => {
                setIsImageValid(true)
                setIsCheckingImage(false)
            }
            img.onerror = () => {
                setIsImageValid(false)
                setIsCheckingImage(false)
            }
            img.src = formData.imageUrl
        } else {
            setIsImageValid(false)
            setIsCheckingImage(false)
        }
    }, [formData.imageUrl])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.type.startsWith("image/")) {
                setImageFile(file)
                setImageFileName(file.name)
                uploadImageFile(file)
            } else {
                toast({
                    title: t("admin.form.errors.invalidFormat"),
                    description: t("admin.form.errors.imageDesc"),
                    variant: "destructive",
                })
                setImageFileName(t("admin.form.fileNotSelected"))
            }
        } else {
            setImageFileName(t("admin.form.fileNotSelected"))
        }
    }

    const uploadImageFile = async (file: File) => {
        setIsUploadingImage(true)
        try {
            const fileName = `banner_${Date.now()}_${file.name}`
            const result = await uploadToGitHub(file, fileName, "banners")

            if (result.success && result.url) {
                setFormData((prev) => ({ ...prev, imageUrl: result.url }))
                setImageFile(null)
                toast({
                    title: t("admin.form.imageUploaded"),
                    description: t("admin.form.bannerUploadedDesc") || "Banner rasmi muvaffaqiyatli yuklandi",
                })
            } else {
                toast({
                    title: t("admin.form.errors.uploadError"),
                    description: result.error || t("admin.form.errors.imageNotUploaded"),
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.warn("Image upload error:", error)
            toast({
                title: t("common.error"),
                description: t("admin.form.errors.imageUploadError"),
                variant: "destructive",
            })
        } finally {
            setIsUploadingImage(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const hasAnyName = (formData.name_uz || "").trim() || (formData.name_ru || "").trim() || (formData.name_en || "").trim() || (formData.name || "").trim()

        if (!hasAnyName || !formData.imageUrl || !restaurantId) {
            toast({
                title: t("admin.form.errors.incomplete"),
                description: t("admin.form.errors.bannerRequired") || "Iltimos, nom va rasm maydonlarini to'ldiring",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const mainName = (formData.name_uz || formData.name_ru || formData.name_en || formData.name || "").trim()
            const bannerData = {
                name: mainName,
                name_uz: (formData.name_uz || "").trim(),
                name_ru: (formData.name_ru || "").trim(),
                name_en: (formData.name_en || "").trim(),
                imageUrl: formData.imageUrl,
                categoryId: formData.categoryId === "all" ? null : formData.categoryId,
                displayAfterCategoryId: formData.displayAfterCategoryId === "all" ? null : formData.displayAfterCategoryId,
                active: formData.active,
                updatedAt: new Date(),
            }

            if (banner?.id) {
                await updateDoc(getRestaurantDoc(restaurantId, "banners", banner.id), bannerData)
                toast({
                    title: t("admin.banner.updateSuccess") || "Banner yangilandi",
                    description: t("admin.form.saveSuccess") || "Muvaffaqiyatli saqlandi",
                })
            } else {
                await addDoc(getRestaurantCollection(restaurantId, "banners"), {
                    ...bannerData,
                    createdAt: new Date(),
                })
                toast({
                    title: t("admin.banner.addSuccess") || "Banner yaratildi",
                    description: t("admin.banner.addDesc") || "Yangi banner qo'shildi",
                })
            }

            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error saving banner:", error)
            toast({
                title: t("common.error"),
                description: t("admin.form.errors.saveError"),
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="icon" onClick={onCancel} className="h-10 w-10 rounded-full border-gray-200">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {banner ? t("admin.menu.item.edit") : t("admin.banner.addBtn")}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Header & Status Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-900">{banner ? t("admin.menu.item.edit") : "Yangi Banner"}</h2>
                            {formData.active ? (
                                <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Aktiv
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-500 border-gray-200">
                                    Nofaol
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">Banner rasmi va uning mantiqiy sozlamalarini boshqaring</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200/50">
                        <Label htmlFor="active" className="text-sm font-semibold text-gray-700">{t("admin.form.available")}</Label>
                        <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left Column: Image & Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Image Card */}
                        <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
                            <CardContent className="p-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    {t("admin.form.bannerImage")}
                                </h3>

                                <div className="space-y-4">
                                    <div className="relative aspect-[21/9] bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden group">
                                        {isCheckingImage || isUploadingImage ? (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                                                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{isUploadingImage ? t("admin.form.uploading") : t("admin.form.checking")}</span>
                                            </div>
                                        ) : null}

                                        {formData.imageUrl && isImageValid ? (
                                            <Image
                                                src={formData.imageUrl}
                                                alt="Preview"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                                                <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Rasm yo'q</span>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                                            <Button type="button" variant="secondary" size="sm" onClick={() => imageInputRef.current?.click()} className="rounded-full font-bold">
                                                <Upload className="w-4 h-4 mr-2" />
                                                O'zgartirish
                                            </Button>
                                            {formData.imageUrl && (
                                                <Button type="button" variant="secondary" size="sm" onClick={() => setShowImagePreview(true)} className="rounded-full font-bold">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Rasm manzili (URL)</Label>
                                        <Input
                                            name="imageUrl"
                                            value={formData.imageUrl}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                            className="h-10 border-gray-200 focus:ring-primary/20"
                                        />
                                        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageFileChange} className="hidden" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Names Card */}
                        <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
                            <CardContent className="p-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4" />
                                    Asosiy ma'lumotlar
                                </h3>

                                <Tabs defaultValue={language} className="w-full">
                                    <TabsList className="flex w-fit bg-gray-100/50 p-1 rounded-xl mb-4">
                                        <TabsTrigger value="uz" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">UZ</TabsTrigger>
                                        <TabsTrigger value="ru" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">RU</TabsTrigger>
                                        <TabsTrigger value="en" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">EN</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="uz" className="mt-0">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("admin.form.nameUz")} *</Label>
                                            <Input
                                                id="name_uz"
                                                name="name_uz"
                                                value={formData.name_uz}
                                                onChange={handleChange}
                                                required
                                                className="h-12 text-lg font-bold border-gray-200"
                                                placeholder="Masalan: Yangi yil chegirmalari"
                                            />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="ru" className="mt-0">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("admin.form.nameRu")}</Label>
                                            <Input
                                                id="name_ru"
                                                name="name_ru"
                                                value={formData.name_ru}
                                                onChange={handleChange}
                                                className="h-12 text-lg font-bold border-gray-200"
                                                placeholder="Напр: Новогодние скидки"
                                            />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="en" className="mt-0">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("admin.form.nameEn")}</Label>
                                            <Input
                                                id="name_en"
                                                name="name_en"
                                                value={formData.name_en}
                                                onChange={handleChange}
                                                className="h-12 text-lg font-bold border-gray-200"
                                                placeholder="E.g: New Year Discounts"
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Logic / Placement */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl h-full flex flex-col">
                            <CardContent className="p-6 flex-1 flex flex-col space-y-8">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
                                    <MousePointer2 className="w-4 h-4" />
                                    Mantiqiy sozlamalar
                                </h3>

                                {/* Step 1: Placement */}
                                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <LayoutGrid className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <Label className="text-sm font-black text-blue-900 leading-none">1. JOYLASHUV</Label>
                                            <p className="text-[10px] text-blue-600/70 font-bold uppercase tracking-tighter mt-1">Qayerda ko'rinadi?</p>
                                        </div>
                                    </div>
                                    <Select
                                        value={formData.displayAfterCategoryId}
                                        onValueChange={(value) => handleSelectChange("displayAfterCategoryId", value)}
                                    >
                                        <SelectTrigger className="h-11 bg-white border-blue-200 shadow-sm focus:ring-blue-500/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                                    <span className="font-bold text-gray-600">Eng tepada (NEW bo'limidan keyin)</span>
                                                </div>
                                            </SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                        <span className="font-medium">{cat.name_uz || cat.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2 px-1">
                                        <Info className="w-3 h-3 text-blue-400" />
                                        <p className="text-[10px] text-blue-400 font-medium italic">Tallangan kategoriyadan so'ng chiqadi</p>
                                    </div>
                                </div>

                                {/* Divider Icon */}
                                <div className="flex justify-center -my-4 relative z-10">
                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                                        <ChevronLeft className="w-4 h-4 text-gray-300 -rotate-90" />
                                    </div>
                                </div>

                                {/* Step 2: Target */}
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                            <MousePointer2 className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <Label className="text-sm font-black text-primary leading-none">2. YO'NALTIRISH</Label>
                                            <p className="text-[10px] text-primary/60 font-bold uppercase tracking-tighter mt-1">Bosganda qayerga o'tadi?</p>
                                        </div>
                                    </div>
                                    <Select
                                        value={formData.categoryId}
                                        onValueChange={(value) => handleSelectChange("categoryId", value)}
                                    >
                                        <SelectTrigger className="h-11 bg-white border-primary/20 shadow-sm focus:ring-primary/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                                    <span className="font-bold text-gray-600">Hech qayerga (Shunchaki rasm)</span>
                                                </div>
                                            </SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                                        <span className="font-medium">{cat.name_uz || cat.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-2 px-1">
                                        <Info className="w-3 h-3 text-primary/40" />
                                        <p className="text-[10px] text-primary/40 font-medium italic">Rasmni bosgan foydalanuvchi shu bo'limga o'tadi</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm flex items-center justify-end gap-3 z-50 md:static md:bg-transparent md:p-0 md:border-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="px-6 py-2 h-11"
                    >
                        {t("admin.form.cancel")}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting || isUploadingImage}
                        className="px-8 py-2 h-11 bg-primary text-white shadow-lg hover:shadow-xl transition-all"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {t("admin.form.saving")}
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-5 w-5" />
                                {banner ? t("admin.form.update") : t("admin.form.add")}
                            </>
                        )}
                    </Button>
                </div>
            </form >

            {/* Image Preview Modal */}
            {
                showImagePreview && formData.imageUrl && (
                    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
                        <div className="relative max-w-4xl max-h-full">
                            <Button
                                onClick={() => setShowImagePreview(false)}
                                variant="outline"
                                size="sm"
                                className="absolute -top-12 right-0 bg-white/20 text-white border-white/40"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                            <Image
                                src={formData.imageUrl}
                                alt="Banner Full"
                                width={1000}
                                height={600}
                                className="object-contain max-h-[80vh] rounded-lg"
                            />
                        </div>
                    </div>
                )
            }
        </div >
    )
}

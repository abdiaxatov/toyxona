"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { collection, doc, addDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getRestaurantCollection, getRestaurantDoc } from "@/lib/firebase-utils"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ImageIcon, CuboidIcon as Cube, X, Plus, Upload, AlertTriangle, ChevronLeft } from "lucide-react"
import type { MenuItem, Category } from "@/types"
import { uploadToGitHub } from "@/lib/github-upload"
import EmbeddedModelViewer from "@/components/embedded-3d-viewer"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/hooks/use-language"

interface MenuItemFormProps {
  item?: MenuItem | null
  categories: Category[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function MenuItemForm({ item, categories, onSuccess, onCancel }: MenuItemFormProps) {
  const router = useRouter()
  const getUrlStr = (img: any) => {
    if (!img) return "";
    return typeof img === 'string' ? img : (img.url || img.imageUrl || img.image || "");
  };
  const initImageUrl = getUrlStr(item?.imageUrl);
  let initImageUrls = (item?.imageUrls || []).map(getUrlStr).filter(Boolean);
  if (initImageUrls.length === 0 && initImageUrl) {
    initImageUrls = [initImageUrl];
  }

  const [formData, setFormData] = useState({
    name: item?.name || "",
    name_uz: item?.name_uz || item?.name || "",
    name_ru: item?.name_ru || item?.name || "",
    name_en: item?.name_en || item?.name || "",
    price: (item?.price !== undefined && item?.price !== null) ? item.price.toString() : "",
    categoryId: item?.categoryId || "",
    description: item?.description || "",
    description_uz: item?.description_uz || item?.description || "",
    description_ru: item?.description_ru || item?.description || "",
    description_en: item?.description_en || item?.description || "",
    imageUrl: initImageUrl, // Keep for fallback
    imageUrls: initImageUrls,
    modelUrl: item?.modelUrl || "",
    isAvailable: item?.isAvailable !== false,
    discountPrice: (item?.discountPrice !== undefined && item?.discountPrice !== null) ? item.discountPrice.toString() : "",
    discountEndsAt: item?.discountEndsAt || "",
    enableDiscount: !!item?.discountPrice && (!item.discountEndsAt || new Date(item.discountEndsAt) > new Date()),
    enableScheduling: !!item?.availableDays && item.availableDays.length < 7,
    availableDays: item?.availableDays || [0, 1, 2, 3, 4, 5, 6],
    variants: (item?.variants || []).map((v: any) => ({
      ...v,
      name_uz: v.name_uz || v.name || "",
      name_ru: v.name_ru || v.name || "",
      name_en: v.name_en || v.name || "",
    })),
    isNew: item?.isNew || false,
    remainingServings: (item?.remainingServings !== undefined && item?.remainingServings !== null) ? item.remainingServings.toString() : "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImageValid, setIsImageValid] = useState(false)
  const [isCheckingImage, setIsCheckingImage] = useState(false)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isUploadingModel, setIsUploadingModel] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [modelUrlError, setModelUrlError] = useState<string | null>(null)

  const { toast } = useToast()
  const { t, language } = useLanguage()
  const { restaurantId } = useAuth()

  const [imageFileName, setImageFileName] = useState(t("admin.form.fileNotSelected"))
  const [modelFileName, setModelFileName] = useState(t("admin.form.fileNotSelected"))

  const imageInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push("/admin/menu")
    }
  }

  // Validate model URL with enhanced checking
  const validateModelUrl = async (url: string) => {
    if (!url) {
      setModelUrlError(null)
      return
    }

    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname.toLowerCase()
      if (!pathname.endsWith(".glb") && !pathname.endsWith(".gltf")) {
        setModelUrlError(t("admin.form.errors.modelFormat"))
        return
      }

      // Test if URL is accessible (with timeout)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          setModelUrlError(`${t("admin.form.errors.serverError")}: ${response.status}`)
          return
        }

        const contentType = response.headers.get("content-type")
        if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
          setModelUrlError(t("admin.form.errors.notModel"))
          return
        }

        setModelUrlError(null)
      } catch (fetchError: any) {
        if (fetchError.name === "AbortError") {
          setModelUrlError(t("admin.form.errors.timeout"))
        } else {
          setModelUrlError(t("admin.form.errors.connection"))
        }
      }
    } catch {
      setModelUrlError(t("admin.form.errors.invalidUrl"))
    }
  }

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

  // Validate model URL when it changes (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.modelUrl) {
        validateModelUrl(formData.modelUrl).catch((error) => {
          console.warn("Model URL validation error:", error)
          setModelUrlError(t("admin.form.errors.checkError"))
        })
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [formData.modelUrl])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: Date.now().toString(),
          name: "",
          name_uz: "",
          name_ru: "",
          name_en: "",
          price: 0,
          unit: "gr",

        },
      ],
    }))
  }

  const handleRemoveVariant = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }))
  }

  const handleVariantChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newVariants = [...prev.variants]
      newVariants[index] = { ...newVariants[index], [field]: value }
      return { ...prev, variants: newVariants }
    })
  }

  const handleModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.name.endsWith(".glb") || file.name.endsWith(".gltf")) {
        setModelFile(file)
        setModelFileName(file.name)
        uploadModelFile(file)
      } else {
        toast({
          title: t("admin.form.errors.invalidFormat"),
          description: t("admin.form.errors.modelDesc"),
          variant: "destructive",
        })
        setModelFileName(t("admin.form.fileNotSelected"))
      }
    } else {
      setModelFileName(t("admin.form.fileNotSelected"))
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const validFiles = files.filter(file => file.type.startsWith("image/"))

      if (validFiles.length + formData.imageUrls.length > 4) {
        toast({
          title: t("common.error"),
          description: language === 'uz' ? "Maksimal 4 ta rasm yuklash mumkin" : language === 'ru' ? "Можно загрузить максимум 4 изображения" : "Maximum 4 images allowed",
          variant: "destructive",
        })
        return
      }

      validFiles.forEach(file => {
        uploadImageFile(file)
      })
    }
  }

  const uploadModelFile = async (file: File) => {
    setIsUploadingModel(true)
    try {
      const fileName = `${Date.now()}_${file.name}`
      const result = await uploadToGitHub(file, fileName, "models")

      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, modelUrl: result.url }))
        setModelFile(null)
        toast({
          title: t("admin.form.modelUploaded"),
          description: t("admin.form.modelUploadedDesc"),
        })
      } else {
        toast({
          title: t("admin.form.errors.uploadError"),
          description: result.error || t("admin.form.errors.modelNotUploaded"),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.warn("Model upload error:", error)
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.modelUploadError"),
        variant: "destructive",
      })
    } finally {
      setIsUploadingModel(false)
    }
  }

  const uploadImageFile = async (file: File) => {
    setIsUploadingImage(true)
    try {
      const fileName = `${Date.now()}_${file.name}`
      const result = await uploadToGitHub(file, fileName, "images")

      if (result.success && result.url) {
        setFormData((prev) => ({
          ...prev,
          imageUrls: [...prev.imageUrls, result.url!]
        }))
        toast({
          title: t("admin.form.imageUploaded"),
          description: t("admin.form.imageUploadedDesc"),
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
    const hasAnyName = formData.name_uz.trim() || formData.name_ru.trim() || formData.name_en.trim() || formData.name.trim()

    // Validate: Price is required ONLY if there are no variants
    const isPriceValid = formData.price || formData.variants.length > 0;

    if (!hasAnyName || !isPriceValid || !formData.categoryId || !restaurantId) {
      toast({
        title: t("admin.form.errors.incomplete"),
        description: t("admin.form.errors.fillRequired"),
        variant: "destructive",
      })
      return
    }

    if (modelUrlError) {
      toast({
        title: t("admin.form.errors.modelUrlError"),
        description: modelUrlError,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const mainName = (formData.name_uz || formData.name_ru || formData.name_en || formData.name).trim()
      const menuItemData = {
        name: mainName,
        name_uz: formData.name_uz.trim(),
        name_ru: formData.name_ru.trim(),
        name_en: formData.name_en.trim(),
        price: formData.price ? Number(formData.price) : 0,
        categoryId: formData.categoryId,
        description: formData.description_uz || formData.description_ru || formData.description_en || formData.description,
        description_uz: formData.description_uz.trim(),
        description_ru: formData.description_ru.trim(),
        description_en: formData.description_en.trim(),
        imageUrl: formData.imageUrls.length > 0 ? formData.imageUrls[0] : null,
        imageUrls: formData.imageUrls,
        modelUrl: formData.modelUrl || null,
        isAvailable: formData.isAvailable,
        discountPrice: formData.enableDiscount && formData.discountPrice ? Number(formData.discountPrice) : null,
        discountEndsAt: formData.enableDiscount ? formData.discountEndsAt : null,
        availableDays: formData.enableScheduling ? formData.availableDays : [0, 1, 2, 3, 4, 5, 6],
        variants: formData.variants.map(v => ({
          ...v,
          name: v.name_uz || v.name_ru || v.name_en || v.name,
          price: Number(v.price),
          discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
          discountEndsAt: v.discountEndsAt || null
        })),
        isNew: formData.isNew,
        remainingServings: formData.remainingServings ? Number(formData.remainingServings) : null,
      }


      if (item?.id) {
        await updateDoc(getRestaurantDoc(restaurantId, "menuItems", item.id), menuItemData)
        toast({
          title: t("admin.form.itemUpdated"),
          description: `${formData.name} ${t("admin.form.itemUpdatedDesc")}`,
        })
      } else {
        await addDoc(getRestaurantCollection(restaurantId, "menuItems"), menuItemData)
        toast({
          title: t("admin.form.itemAdded"),
          description: `${formData.name} ${t("admin.form.itemAddedDesc")}`,
        })
        const audio = new Audio("/success.mp3")
        audio.play().catch((e) => console.warn("Audio play failed:", e))
      }

      if (onSuccess) {
        onSuccess()
      } else {
        handleCancel()
      }
    } catch (error) {
      console.warn("Error saving menu item:", error)
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
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={handleCancel} className="h-10 w-10 rounded-full border-gray-200">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {item ? t("admin.form.editItem") : t("admin.form.addItem")}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Live Preview Section */}
        <div className="bg-gradient-to-br bg-primary/10 rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            {t("admin.form.livePreview")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Multi-Image Gallery Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-green-600" />
                {t("admin.form.image")} ({formData.imageUrls.length}/4)
              </Label>
              <div className="grid grid-cols-2 gap-3 h-52">
                {formData.imageUrls.length > 0 ? (
                  <>
                    <div className="relative col-span-1 h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm group">
                      <Image
                        src={formData.imageUrls[0] || "/placeholder.svg"}
                        alt="Primary"
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                        Asosiy
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== 0) }))}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-rows-2 gap-3 h-full">
                      {[1, 2].map((idx) => (
                        <div key={idx} className="relative h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm group">
                          {formData.imageUrls[idx] ? (
                            <>
                              <Image
                                src={formData.imageUrls[idx]}
                                alt={`Image ${idx + 1}`}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }))}
                                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 h-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">{t("admin.form.imagePreview")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3D Model Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Cube className="w-4 h-4 text-primary" />
                3D Model
                {modelUrlError && (
                  <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t("common.error")}
                  </span>
                )}
              </Label>
              <div className="relative h-48 bg-gradient-to-br bg-white rounded-xl border-2 border-dashed border-gray-300 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {isUploadingModel ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-gray-600 font-medium">{t("admin.form.modelUploading")}</p>
                    </div>
                  </div>
                ) : (
                  <EmbeddedModelViewer modelUrl={formData.modelUrl} className="w-full h-full" />
                )}
              </div>
              {modelUrlError && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    {t("admin.form.errors.modelUrlError")}
                  </div>
                  <p>{modelUrlError}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {t("admin.form.basicInfo")}
              </h3>
              <div className="space-y-4">
                <Tabs defaultValue={language} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="uz">O'zbekcha</TabsTrigger>
                    <TabsTrigger value="ru" className="flex gap-1">Русский <span className="text-[10px] opacity-60 font-normal lowercase">{t("common.optional")}</span></TabsTrigger>
                    <TabsTrigger value="en" className="flex gap-1">English <span className="text-[10px] opacity-60 font-normal lowercase">{t("common.optional")}</span></TabsTrigger>
                  </TabsList>

                  <TabsContent value="uz" className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name_uz" className="text-sm font-medium text-gray-700">
                        {t("admin.form.nameUz")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name_uz"
                        name="name_uz"
                        value={formData.name_uz}
                        onChange={handleChange}
                        required
                        placeholder={t("admin.form.itemNamePlaceholder")}
                        className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_uz" className="text-sm font-medium text-gray-700">
                        {t("admin.form.descUz")}
                      </Label>
                      <Textarea
                        id="description_uz"
                        name="description_uz"
                        value={formData.description_uz}
                        onChange={handleChange}
                        rows={3}
                        placeholder={t("admin.form.itemDescPlaceholder")}
                        className="border-2 border-gray-200 focus:border-primary rounded-lg resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="ru" className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name_ru" className="text-sm font-medium text-gray-700">
                        {t("admin.form.nameRu")}
                      </Label>
                      <Input
                        id="name_ru"
                        name="name_ru"
                        value={formData.name_ru}
                        onChange={handleChange}
                        placeholder="Плов"
                        className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_ru" className="text-sm font-medium text-gray-700">
                        {t("admin.form.descRu")}
                      </Label>
                      <Textarea
                        id="description_ru"
                        name="description_ru"
                        value={formData.description_ru}
                        onChange={handleChange}
                        rows={3}
                        placeholder="О составе и приготовлении..."
                        className="border-2 border-gray-200 focus:border-primary rounded-lg resize-none"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="en" className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name_en" className="text-sm font-medium text-gray-700">
                        {t("admin.form.nameEn")}
                      </Label>
                      <Input
                        id="name_en"
                        name="name_en"
                        value={formData.name_en}
                        onChange={handleChange}
                        placeholder="Plov"
                        className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_en" className="text-sm font-medium text-gray-700">
                        {t("admin.form.descEn")}
                      </Label>
                      <Textarea
                        id="description_en"
                        name="description_en"
                        value={formData.description_en}
                        onChange={handleChange}
                        rows={3}
                        placeholder="About ingredients..."
                        className="border-2 border-gray-200 focus:border-primary rounded-lg resize-none"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* 🔹 Price vs Variants Mode Switcher */}
                <div className="bg-slate-50 rounded-xl p-1.5 flex items-center justify-between border border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      // Switch to Simple: Clear variants
                      if (formData.variants.length > 0 && !confirm("Variantlar o'chib ketadi. Davom etasizmi?")) return;
                      setFormData(prev => ({ ...prev, variants: [] }));
                    }}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2",
                      formData.variants.length === 0
                        ? "bg-white text-primary shadow-md ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-white/50"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", formData.variants.length === 0 ? "bg-primary" : "bg-transparent")} />
                    Oddiy Mahsulot (Narx)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Switch to Variable: Clear price, add default variant if empty
                      setFormData(prev => ({
                        ...prev,
                        price: "",
                        variants: prev.variants.length > 0 ? prev.variants : [{
                          id: Date.now().toString(),
                          name: "",
                          name_uz: "",
                          name_ru: "",
                          name_en: "",
                          price: 0,
                          unit: "gr",
                        }]
                      }));
                    }}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2",
                      formData.variants.length > 0
                        ? "bg-white text-primary shadow-md ring-1 ring-slate-200"
                        : "text-slate-500 hover:bg-white/50"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", formData.variants.length > 0 ? "bg-primary" : "bg-transparent")} />
                    Variantli Mahsulot
                  </button>
                </div>

                {/* Show Price Input ONLY if NO variants (Simple Mode) */}
                {formData.variants.length === 0 && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                        {t("admin.form.price")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        value={formData.price}
                        onChange={handleChange}
                        required={formData.variants.length === 0}
                        placeholder="25000"
                        className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg font-bold text-lg"
                      />
                    </div>
                  </div>
                )}

                {/* 🔹 Product Variants Section (Only if Variable Mode) */}
                {formData.variants.length > 0 || (formData.price === "" && formData.variants.length === 0 && false /* hidden logic helper, relying on buttons */) ? (
                  null
                ) : null}

                {/* We need to conditionally render the variants block based on our 'mode' which is inferred from variants.length > 0 OR if the user clicked 'Variable' (we can init a variant if empty). 
                    Let's use the button click to explicitly add an empty variant if switching to variable mode, ensuring the detailed block shows up.
                */}

                {/* 🔹 Product Variants (Sizes/Weights) */}
                {formData.variants.length > 0 && (
                  <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        Mahsulot Variantlari (Gramm/Dona)
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddVariant}
                        className="h-9 px-4 rounded-full border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Qo'shish
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {formData.variants.map((variant, index) => (
                        <div key={variant.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative animate-in zoom-in-95 duration-200">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Variant Nomi</Label>
                              <div className="space-y-2">
                                <Input
                                  placeholder="Masalan: 120gr yoki Katta"
                                  value={variant.name_uz}
                                  onChange={(e) => handleVariantChange(index, "name_uz", e.target.value)}
                                  className="h-10 border-slate-200 focus:border-primary text-sm font-bold"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    placeholder="RU: 120гр"
                                    value={variant.name_ru}
                                    onChange={(e) => handleVariantChange(index, "name_ru", e.target.value)}
                                    className="h-8 text-[11px] border-slate-100 focus:border-primary"
                                  />
                                  <Input
                                    placeholder="EN: 120g"
                                    value={variant.name_en}
                                    onChange={(e) => handleVariantChange(index, "name_en", e.target.value)}
                                    className="h-8 text-[11px] border-slate-100 focus:border-primary"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Narxi va Birligi</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  placeholder="15000"
                                  value={variant.price || ""}
                                  onChange={(e) => handleVariantChange(index, "price", e.target.value)}
                                  className="flex-1 h-10 border-slate-200 focus:border-primary text-sm font-black text-primary"
                                />
                                <Select
                                  value={variant.unit || "gr"}
                                  onValueChange={(value) => handleVariantChange(index, "unit", value)}
                                >
                                  <SelectTrigger className="w-[80px] h-10 border-slate-200 font-bold">
                                    <SelectValue placeholder="Birlik" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="gr">gr</SelectItem>
                                    <SelectItem value="pc">dona</SelectItem>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="l">L</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">Bu variant uchun narx va o'lchov birligi.</p>
                            </div>
                          </div>

                          {/* Variant Discount Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100/50">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Chegirma Narxi (ixtiyoriy)</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="Chegirma narxi"
                                  value={variant.discountPrice || ""}
                                  onChange={(e) => handleVariantChange(index, "discountPrice", e.target.value)}
                                  className="h-10 border-slate-200 focus:border-red-500 text-sm font-black text-red-600 pr-10"
                                />
                                <div className="absolute right-3 top-2.5 text-[9px] font-bold text-gray-400">SUM</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Chegirma Tugash Vaqti</Label>
                              <Input
                                type="datetime-local"
                                value={variant.discountEndsAt || ""}
                                onChange={(e) => handleVariantChange(index, "discountEndsAt", e.target.value)}
                                onClick={(e) => e.currentTarget.showPicker?.()}
                                className="h-10 border-slate-200 focus:border-red-500 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduling Section */}
                <div className={`bg-white rounded-xl p-6 border transition-colors duration-300 ${formData.enableScheduling ? "border-primary/20 shadow-primary/5" : "border-gray-200 shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        <Cube className="w-3.5 h-3.5" />
                      </span>
                      {t("admin.form.scheduling.title")}
                    </h3>
                    <Switch
                      checked={formData.enableScheduling}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          enableScheduling: checked,
                          availableDays: checked ? prev.availableDays : [0, 1, 2, 3, 4, 5, 6]
                        }))
                      }
                    />
                  </div>

                  {formData.enableScheduling && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          {t("admin.form.scheduling.availableDays")}
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const newDays = formData.availableDays.includes(day)
                                  ? formData.availableDays.filter((d) => d !== day)
                                  : [...formData.availableDays, day]
                                setFormData((prev) => ({ ...prev, availableDays: newDays }))
                              }}
                              className={cn(
                                "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm",
                                formData.availableDays.includes(day)
                                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105"
                                  : "bg-white border-gray-200 text-gray-500 hover:border-primary/50 hover:bg-gray-50"
                              )}
                            >
                              {t(`admin.form.scheduling.days.${day}`)}
                            </button>
                          ))}
                        </div>
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                          <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1.5">
                            <Plus className="w-3 h-3" />
                            {t("admin.form.scheduling.availableDays")} tanlanmasa, mahsulot har kuni ko'rinadi.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId" className="text-sm font-medium text-gray-700">
                    {t("admin.form.category")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="categoryId"
                      value={formData.categoryId}
                      onChange={(e) => handleSelectChange("categoryId", e.target.value)}
                      className="h-11 w-full appearance-none rounded-lg border-2 border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-0 transition-colors cursor-pointer"
                      required
                    >
                      <option value="" disabled>
                        {t("admin.form.selectCategory")}
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name_uz || category.name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Discount Settings */}
            <div className={`bg-white rounded-xl p-6 border transition-colors duration-300 ${formData.enableDiscount ? "border-red-200 shadow-red-50" : "border-gray-200 shadow-sm"}`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">%</span>
                  {t("admin.form.discount")}
                </h3>
                <Switch
                  checked={formData.enableDiscount}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        enableDiscount: true,
                        discountPrice: "",
                        discountEndsAt: ""
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, enableDiscount: false }));
                    }
                  }}
                />
              </div>

              {formData.enableDiscount && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="discountPrice" className="text-sm font-medium text-gray-700">
                      {t("admin.form.discountPrice")} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="discountPrice"
                        name="discountPrice"
                        type="number"
                        value={formData.discountPrice}
                        onChange={handleChange}
                        placeholder="20000"
                        className={`h-11 border-2 rounded-lg pr-12 ${Number(formData.discountPrice) >= Number(formData.price)
                          ? "border-red-500 focus:border-red-500"
                          : "border-gray-200 focus:border-red-500"
                          }`}
                      />
                      <div className="absolute right-3 top-3 text-xs font-bold text-gray-400">SUM</div>
                    </div>
                    {Number(formData.discountPrice) >= Number(formData.price) && (
                      <p className="text-xs text-red-500 font-medium">
                        {t("admin.form.errors.discountGreater")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discountEndsAt" className="text-sm font-medium text-gray-700">
                      {t("admin.form.discountEndsAt")} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="discountEndsAt"
                      name="discountEndsAt"
                      type="datetime-local"
                      value={formData.discountEndsAt}
                      onChange={handleChange}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="h-11 border-2 border-gray-200 focus:border-red-500 rounded-lg"
                    />
                    <p className="text-xs text-gray-500">
                      {t("admin.form.discountEndsAtDesc")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{t("admin.form.settings")}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="isAvailable" className="font-medium text-gray-800">
                      {t("admin.form.available")}
                    </Label>
                    <p className="text-sm text-gray-600">{t("admin.form.availableDesc")}</p>
                  </div>
                  <Switch
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onCheckedChange={(checked) => handleSwitchChange("isAvailable", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label htmlFor="isNew" className="font-medium text-gray-800">
                      Yangi Mahsulot
                    </Label>
                    <p className="text-sm text-gray-600">Mahsulot menyuning eng boshida "NEW" qatorida chiqadi.</p>
                  </div>
                  <Switch
                    id="isNew"
                    checked={formData.isNew}
                    onCheckedChange={(checked) => handleSwitchChange("isNew", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="remainingServings" className="font-medium text-gray-800">
                      Sotuvdagi mahsulot soni
                    </Label>
                    <p className="text-sm text-gray-600">Mahsulot tugaganidan keyin avtomatik ravishda "Stop-list"ga tushadi.</p>
                  </div>
                  <div className="w-24">
                    <Input
                      id="remainingServings"
                      name="remainingServings"
                      type="number"
                      value={formData.remainingServings}
                      onChange={handleChange}
                      placeholder="∞"
                      className="h-10 text-center font-bold border-2 border-gray-200 focus:border-primary"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column - Media Upload */}
          <div className="space-y-6">
            {/* Image Upload Gallery */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-green-600" />
                  {t("admin.form.imageUpload")}
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                  {formData.imageUrls.length} / 4
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {formData.imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square bg-slate-50 rounded-lg border border-slate-200 overflow-hidden group">
                      <Image src={url} alt={`Upload ${index}`} fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-8 w-8 rounded-full"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {index === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-[8px] text-white font-black text-center py-0.5 uppercase tracking-tighter">
                          Asosiy
                        </div>
                      )}
                    </div>
                  ))}

                  {formData.imageUrls.length < 4 && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-slate-400 hover:text-primary group"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <div className="p-2 bg-slate-50 rounded-full group-hover:bg-primary/10 transition-colors">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wide">{t("admin.form.uploadFile")}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100/50">
                  <p className="text-[10px] text-amber-700 leading-relaxed font-medium flex gap-2">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                    {language === 'uz' ? "Birinchi yuklangan rasm asosiy bo'lib hisoblanadi. Jami 4 tagacha rasm yuklashingiz mumkin." : language === 'ru' ? "Первое загруженное изображение считается основным. Вы можете загрузить до 4 изображений." : "The first uploaded image is considered primary. You can upload up to 4 images."}
                  </p>
                </div>
              </div>
            </div>

            {/* 3D Model Upload */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                <Cube className="w-5 h-5 text-primary" />
                {t("admin.form.modelUpload")}
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modelUrl" className="text-sm font-medium text-gray-700">
                    {t("admin.form.modelUrl")}
                  </Label>
                  <Input
                    id="modelUrl"
                    name="modelUrl"
                    value={formData.modelUrl}
                    onChange={handleChange}
                    placeholder="https://github.com/.../model.glb"
                    className={`h-11 border-2 rounded-lg ${modelUrlError
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-primary"
                      }`}
                  />
                  {modelUrlError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {modelUrlError}
                    </p>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">{t("admin.form.or")}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelFile" className="text-sm font-medium text-gray-700">
                    {t("admin.form.uploadFile")} (.glb, .gltf)
                  </Label>
                  {/* Hidden input */}
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    id="modelFile"
                    ref={modelInputRef}
                    onChange={handleModelFileChange}
                    disabled={isUploadingModel}
                    className="hidden"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => modelInputRef.current?.click()}
                      className="h-24 w-full border-2 border-dashed border-primary hover:border-primary rounded-lg flex items-center justify-center text-sm text-gray-600 cursor-pointer transition-colors bg-primary/10 hover:bg-primary/20"
                      disabled={isUploadingModel}
                    >
                      <div className="text-center">
                        <Cube className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-medium text-gray-700">{modelFileName}</p>
                        <p className="text-xs text-gray-500 mt-1">{t("admin.form.modelFormats")}</p>
                      </div>
                    </button>
                    {isUploadingModel && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                          <p className="text-sm text-gray-600 font-medium">{t("admin.form.uploading")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm flex items-center justify-end gap-3 z-50 md:static md:bg-transparent md:p-0 md:border-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="px-6 py-2 h-11 border-2 border-gray-300  hover:border-primary rounded-lg font-medium bg-transparent"
          >
            {t("admin.form.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isUploadingImage || isUploadingModel || !!modelUrlError}
            className="px-8 py-2 h-11 bg-gradient-to-r from-primary to-primary/90 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("admin.form.saving")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                {item ? t("admin.form.update") : t("admin.form.add")}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Image Preview Modal */}
      {showImagePreview && formData.imageUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <Button
              onClick={() => setShowImagePreview(false)}
              variant="outline"
              size="sm"
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white/30 text-white border-white/40 backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </Button>
            <Image
              src={formData.imageUrl || "/placeholder.svg"}
              alt={t("admin.form.image")}
              width={800}
              height={600}
              className="object-contain max-h-[80vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}

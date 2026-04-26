"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRestaurant } from "@/components/admin/restaurant-provider"
import { db } from "@/lib/firebase"
import {
  doc,
  updateDoc,
  collection,
  query,
  getDocs,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from "firebase/firestore"
import { getRestaurantCollection, getRestaurantDoc } from "@/lib/firebase-utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import {
  Settings,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Download,
  Info,
  ChevronRight,
  Package,
  Layers,
  Save,
  Loader2,
  ExternalLink,
  Ban,
  Copy,
  Check
} from "lucide-react"
import {
  AliPOSRestaurant,
  AliPOSCategory,
  AliPOSProduct,
  AliPOSConfig
} from "@/lib/alipos-service"
import { getAliPOSRestaurantsAction, getAliPOSMenuAction } from "@/lib/alipos-actions"
import { optimizeImage } from "@/lib/image-optimizer"

export default function AliPOSIntegrationPage() {
  const { restaurant, isLoading: restaurantLoading } = useRestaurant()
  const [config, setConfig] = useState<AliPOSConfig>({
    baseUrl: "",
    clientId: "",
    clientSecret: "",
    restaurantId: ""
  })
  
  const [platform, setPlatform] = useState("")
  const [lastError, setLastError] = useState<any>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(id)
    setTimeout(() => setCopiedUrl(null), 2000)
    toast({
      title: "Nusxa olindi",
      description: "Webhook URL manzili xotiraga nusxalandi",
    })
  }

  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [aliRestaurants, setAliRestaurants] = useState<AliPOSRestaurant[]>([])
  const [aliMenu, setAliMenu] = useState<{ categories: AliPOSCategory[], products: AliPOSProduct[] } | null>(null)
  const [localCategories, setLocalCategories] = useState<any[]>([])
  const [localProducts, setLocalProducts] = useState<any[]>([])
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const handleImageError = (prodId: string) => {
    setImageErrors(prev => ({ ...prev, [prodId]: true }))
  }

  useEffect(() => {
    if (restaurant?.integrations?.alipos) {
      const dbConfig = restaurant.integrations.alipos
      setConfig({
        baseUrl: dbConfig.baseUrl || "",
        clientId: dbConfig.clientId || "",
        clientSecret: dbConfig.clientSecret || "",
        restaurantId: dbConfig.restaurantId || ""
      })
      if (dbConfig.platform) setPlatform(dbConfig.platform)
    }
  }, [restaurant])

  useEffect(() => {
    if (!restaurant?.id) return

    const catsQuery = query(getRestaurantCollection(restaurant.id, "categories"), orderBy("name"))
    const prodsQuery = query(getRestaurantCollection(restaurant.id, "menuItems"), orderBy("name"))

    const unsubCats = onSnapshot(catsQuery, (snap) => {
      setLocalCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    const unsubProds = onSnapshot(prodsQuery, (snap) => {
      setLocalProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return () => {
      unsubCats()
      unsubProds()
    }
  }, [restaurant?.id])

  const handleSaveConfig = async () => {
    if (!restaurant?.id) return
    setIsSaving(true)
    try {
      await updateDoc(doc(db, "restaurants", restaurant.id), {
        "integrations.alipos": {
          ...restaurant?.integrations?.alipos,
          ...config,
          platform: platform
        }
      })
      toast({
        title: "Muvaffaqiyat",
        description: "AliPOS sozlamalari saqlandi"
      })
    } catch (error) {
      toast({
        title: "Xatolik",
        description: "Sozlamalarni saqlashda xatolik yuz berdi",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const fetchAliPOSData = async () => {
    if (!restaurant?.id) return
    setIsSyncing(true)
    setLastError(null)
    try {
      const resResult: any = await getAliPOSRestaurantsAction(config)
      
      if (!resResult.success) {
        setLastError(resResult)
        toast({
          title: "Ulanishda xatolik",
          description: resResult.error,
          variant: "destructive"
        })
        setIsSyncing(false)
        return
      }
      
      setAliRestaurants(resResult.data)

      if (config.restaurantId) {
        const menuResult: any = await getAliPOSMenuAction(config)
        if (menuResult.success) {
          setAliMenu(menuResult.data)
        } else {
          setLastError(menuResult)
          toast({
            title: "Menyuda xatolik",
            description: menuResult.error,
            variant: "destructive"
          })
        }
      }

      toast({
        title: "Ma'lumotlar yangilandi",
        description: "AliPOS ma'lumotlari muvaffaqiyatli yuklandi"
      })
    } catch (error: any) {
      setLastError({ error: error.message || "Kutilmagan xatolik" })
      toast({
        title: "Xatolik",
        description: error.message || "AliPOS ma'lumotlarini yuklashda xatolik",
        variant: "destructive"
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const findAliPOSImage = (prod: any): string[] => {
    // AliPOS API returns images as an array of objects with a 'url' property
    if (prod.images && Array.isArray(prod.images) && prod.images.length > 0) {
      return prod.images.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean)
    }
    if (prod.imageUrl && typeof prod.imageUrl === 'string') return [prod.imageUrl]
    if (prod.image && typeof prod.image === 'string') return [prod.image]
    if (prod.photo && typeof prod.photo === 'string') return [prod.photo]
    return []
  }

  const handleImportMenu = async () => {
    if (!restaurant?.id || !aliMenu) return
    setIsImporting(true)

    try {
      const batch = writeBatch(db)
      const newCategoryMap = new Map<string, string>()

      // 1. Sync Categories
      for (const aliCat of aliMenu.categories) {
        const existingCat = localCategories.find(c => c.aliposId === aliCat.id)
        if (existingCat) {
          batch.update(getRestaurantDoc(restaurant.id, "categories", existingCat.id), {
            name: aliCat.name,
            name_uz: aliCat.name,
            order: aliCat.sortOrder,
            updatedAt: serverTimestamp()
          })
          newCategoryMap.set(aliCat.id, existingCat.id)
        } else {
          const newCatRef = doc(collection(db, "restaurants", restaurant.id, "categories"))
          batch.set(newCatRef, {
            name: aliCat.name,
            name_uz: aliCat.name,
            order: aliCat.sortOrder,
            aliposId: aliCat.id,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          newCategoryMap.set(aliCat.id, newCatRef.id)
        }
      }

      // 2. Sync Products
      for (const aliProd of aliMenu.products) {
        const existingProd = localProducts.find(p => p.aliposId === aliProd.id)
        const localCatId = newCategoryMap.get(aliProd.categoryId)

        const images = findAliPOSImage(aliProd)
        const productData = {
          name: aliProd.name,
          name_uz: aliProd.name,
          description: aliProd.description || "",
          description_uz: aliProd.description || "",
          price: aliProd.price,
          imageUrls: images,
          imageUrl: images.length > 0 ? images[0] : "",
          categoryId: localCatId || null,
          category: aliProd.categoryId, // AliPOS category ID as fallback
          order: aliProd.sortOrder,
          aliposId: aliProd.id,
          available: true,
          isAvailable: true,
          updatedAt: serverTimestamp()
        }

        if (existingProd) {
          batch.update(getRestaurantDoc(restaurant.id, "menuItems", existingProd.id), productData)
        } else {
          const newProdRef = doc(collection(db, "restaurants", restaurant.id, "menuItems"))
          batch.set(newProdRef, {
            ...productData,
            createdAt: serverTimestamp()
          })
        }
      }

      await batch.commit()
      toast({
        title: "Import yakunlandi",
        description: `${aliMenu.categories.length} kategoriya va ${aliMenu.products.length} mahsulot sinxronlashtirildi.`
      })
    } catch (error: any) {
      console.error("Import error:", error)
      toast({
        title: "Xatolik",
        description: "Menyuni import qilishda xatolik yuz berdi",
        variant: "destructive"
      })
    } finally {
      setIsImporting(false)
    }
  }

  if (restaurantLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

  return (
    <div className="space-y-8 w-full max-w-full p-4 md:p-8 animation-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <Zap className="text-primary w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">AliPOS Integratsiyasi</h1>
            <p className="text-muted-foreground mt-1 text-lg">Menyuni avtomatik sinxronlash va import qilish</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchAliPOSData}
            disabled={isSyncing || !config.clientId}
            variant="outline"
            className="rounded-2xl h-12 px-6 border-2 hover:bg-gray-50 transition-all active:scale-95"
          >
            {isSyncing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
            Yangilash
          </Button>
          <Button
            onClick={handleImportMenu}
            disabled={isImporting || !aliMenu}
            className="rounded-2xl h-12 px-8 bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all active:scale-95"
          >
            {isImporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
            Import qilish
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-8 bg-gray-100/50 p-1.5 rounded-2xl border">
          <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all text-sm font-bold">
            <Settings className="w-4 h-4 mr-2" /> Sozlamalar
          </TabsTrigger>
          <TabsTrigger value="preview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all text-sm font-bold">
            <Package className="w-4 h-4 mr-2" /> Menyu (Preview)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-gray-50/50 border-b p-8">
                <CardTitle className="text-2xl font-black flex items-center gap-3"><Settings className="text-primary w-6 h-6" /> API Konfiguratsiyasi</CardTitle>
                <CardDescription className="text-base">AliPOS integratsiyasi uchun zaruriy API ma'lumotlarini kiriting</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8 w-full">
                <div className="flex flex-col gap-6 w-full">
                  <div className="space-y-3 w-full">
                    <Label htmlFor="baseUrl" className="text-sm font-bold text-gray-700">AliPOS Base URL</Label>
                    <Input
                      id="baseUrl"
                      placeholder="https://web.alipos.uz"
                      value={config.baseUrl}
                      onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                      className="h-12 w-full rounded-xl bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-primary transition-all text-base"
                    />
                  </div>

                  <div className="space-y-3 w-full">
                    <Label htmlFor="restaurantId" className="font-bold text-sm text-gray-700">Manual Restaurant ID (ID orqali ulanish)</Label>
                    <Input
                      id="restaurantId"
                      value={config.restaurantId}
                      onChange={(e) => setConfig({ ...config, restaurantId: e.target.value })}
                      placeholder="83041096-781a-4e60-aa25-cc3243e1dbe3"
                      className="h-12 w-full rounded-xl bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-primary transition-all text-base"
                    />
                  </div>

                  <div className="space-y-3 w-full">
                    <Label htmlFor="platform" className="font-bold text-sm text-gray-700">Platform Nomi (AliPOS'da ko'rinadi)</Label>
                    <Input
                      id="platform"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      placeholder="FoodHub"
                      className="h-12 w-full rounded-xl bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-primary transition-all text-base"
                    />
                  </div>

                  <div className="space-y-3 w-full">
                    <Label htmlFor="clientId" className="text-sm font-bold text-gray-700">Client ID</Label>
                    <Input
                      id="clientId"
                      value={config.clientId}
                      onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                      className="h-12 w-full rounded-xl bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-primary transition-all text-base"
                    />
                  </div>
                  <div className="space-y-3 w-full">
                    <Label htmlFor="clientSecret" className="text-sm font-bold text-gray-700">Client Secret</Label>
                    <Input
                      id="clientSecret"
                      type="password"
                      value={config.clientSecret}
                      onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                      className="h-12 w-full rounded-xl bg-gray-50 focus:bg-white border-2 border-gray-100 focus:border-primary transition-all text-base"
                    />
                  </div>
                </div>
                
                {lastError && (
                  <div className="mt-8 p-6 bg-red-50 border-2 border-red-100 rounded-3xl animate-in zoom-in-95 duration-300">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-1" />
                      <div className="space-y-3 w-full">
                        <h4 className="font-black text-red-900 text-lg">Ulanishda muammo yuz berdi</h4>
                        <p className="text-red-700 font-medium">{lastError.error}</p>
                        
                        {lastError.code === "UND_ERR_CONNECT_TIMEOUT" && (
                          <div className="bg-white/50 p-4 rounded-xl border border-red-200 text-sm text-red-800">
                            <strong>Maslahat:</strong> Server bilan aloqa o'rnatib bo'lmadi (Timeout). Iltimos, <strong>Base URL</strong> manzilini alternativ manzillarga o'zgartirib ko'ring yoki internetingizni tekshiring.
                          </div>
                        )}

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-800 hover:bg-red-100 p-0 h-auto font-bold"
                          onClick={() => setShowErrorDetails(!showErrorDetails)}
                        >
                          {showErrorDetails ? "Tafsilotlarni yopish" : "Tafsilotlarni ko'rish"}
                        </Button>

                        {showErrorDetails && (
                          <pre className="mt-2 p-4 bg-red-950 text-red-200 rounded-xl text-[10px] overflow-auto max-h-40 font-mono">
                            {JSON.stringify(lastError, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveConfig} disabled={isSaving} className="h-12 px-10 rounded-xl bg-gray-900 text-white hover:bg-black transition-all font-bold">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sozlamalarni saqlash
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-2xl rounded-3xl bg-primary text-white p-8">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-xl font-black flex items-center gap-2"><Zap className="w-6 h-6" /> Integratsiya Holati</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="opacity-80 font-medium">Ulanish</span>
                      {config.clientId ? <Badge className="bg-white/20 text-white border-none rounded-lg px-2 py-1"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Faol</Badge> : <Badge className="bg-black/20 text-white border-none rounded-lg px-2 py-1">Faol emas</Badge>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="opacity-80 font-medium">Oxirgi sinxronizatsiya</span>
                      <span className="font-bold">Hozir</span>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="flex items-center justify-between">
                      <span className="opacity-80 font-medium">Mahsulotlar</span>
                      <span className="text-2xl font-black">{localProducts.filter(p => p.aliposId).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-2xl rounded-3xl bg-white p-8 border-dashed border-2 border-gray-200">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900"><Info className="w-4 h-4 text-primary" /> Webhook Ma'lumotlari</CardTitle>
                  <CardDescription className="text-xs mt-1">AliPOS tizimiga beriladigan yagona webhook manzillari</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">Order Status Webhook</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-[11px] bg-gray-50 px-3 py-2.5 rounded-xl block break-all font-mono border-2 border-gray-100 text-gray-800">
                        {origin}/api/webhook/alipos/order-status
                      </code>
                      <Button 
                        onClick={() => handleCopy(`${origin}/api/webhook/alipos/order-status`, 'status')} 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 h-10 w-10 bg-gray-50 hover:bg-white hover:border-primary border-2 border-gray-100 rounded-xl transition-all"
                      >
                        {copiedUrl === 'status' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-bold">StopList Webhook</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-[11px] bg-gray-50 px-3 py-2.5 rounded-xl block break-all font-mono border-2 border-gray-100 text-gray-800">
                        {origin}/api/webhook/alipos/stoplist/[productId]?RestaurantId=[resId]&Count=[count]
                      </code>
                      <Button 
                        onClick={() => handleCopy(`${origin}/api/webhook/alipos/stoplist/[productId]?RestaurantId=[resId]&Count=[count]`, 'stoplist')} 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 h-10 w-10 bg-gray-50 hover:bg-white hover:border-primary border-2 border-gray-100 rounded-xl transition-all"
                      >
                        {copiedUrl === 'stoplist' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 font-medium">
                      Eslatma: StopList uchun <code>[productId]</code> kabi parametrlar tizim tomonidan yuboriladi. Doim mana shu URL'ni nusxalab AliPOS operatoriga yuboring.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 border-b p-8">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-black flex items-center gap-3 text-gray-900"><Package className="text-primary w-6 h-6" /> AliPOS Menyu Preview</CardTitle>
                  <CardDescription className="text-base">AliPOS'dan yuklangan ma'lumotlarni tekshiring</CardDescription>
                </div>
                {aliMenu && (
                   <div className="flex gap-4">
                      <div className="text-center bg-gray-100 px-6 py-3 rounded-2xl border">
                        <div className="text-xs font-black text-gray-500 uppercase">Kategoriyalar</div>
                        <div className="text-xl font-black text-primary">{aliMenu.categories.length}</div>
                      </div>
                      <div className="text-center bg-gray-100 px-6 py-3 rounded-2xl border">
                        <div className="text-xs font-black text-gray-500 uppercase">Mahsulotlar</div>
                        <div className="text-xl font-black text-primary">{aliMenu.products.length}</div>
                      </div>
                   </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {!aliMenu ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100">
                    <Download className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Ma'lumotlar mavjud emas</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto">AliPOS menyusini ko'rish uchun "Yangilash" tugmasini bosing</p>
                  <Button onClick={fetchAliPOSData} variant="outline" className="rounded-xl px-10 border-2 font-bold">Ma'lumotlarni yuklash</Button>
                </div>
              ) : (
                <div className="space-y-12 animate-in fade-in duration-500">
                    {aliMenu.products.length > 0 && (
                      <div className="mb-8 p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[10px] overflow-auto max-h-40 border border-slate-700 shadow-xl">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">DIAGNOSTIC: RAW DATA (FIRST PRODUCT)</span>
                          <Badge variant="outline" className="text-slate-400 border-slate-700 text-[8px]">DEBUG MODE</Badge>
                        </div>
                        <pre>{JSON.stringify(aliMenu.products[0], null, 2)}</pre>
                      </div>
                    )}

                    {aliMenu.categories.map(cat => {
                     const products = aliMenu.products.filter(p => p.categoryId === cat.id)
                     if (products.length === 0) return null
                     return (
                       <div key={cat.id} className="space-y-6">
                         <div className="flex items-center gap-4">
                           <h3 className="text-2xl font-black tracking-tight text-gray-900">{cat.name}</h3>
                           <Badge className="bg-gray-100 text-gray-600 border-none rounded-lg px-3 py-1 font-bold">{products.length} ta mahsulot</Badge>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map(prod => (
                              <Card key={prod.id} className="rounded-2xl border-none shadow-md hover:shadow-xl transition-all border border-gray-100/50 overflow-hidden flex flex-col group">
                                {prod.images && prod.images.length > 0 && (
                                  <div className="relative h-40 bg-gray-100">
                                    <Image 
                                      src={(() => {
                                        const rawImg = prod.images[0];
                                        const urlStr = typeof rawImg === 'string' ? rawImg : (rawImg.url || rawImg.imageUrl || rawImg.image);
                                        return imageErrors[prod.id] ? urlStr : optimizeImage(rawImg, 400);
                                      })()}
                                      alt={prod.name} 
                                      fill 
                                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                                      loading="eager"
                                      priority={true}
                                      onError={() => handleImageError(prod.id)}
                                    />
                                  </div>
                                )}
                                <div className="p-6 flex flex-col justify-between flex-1">
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">{prod.name}</h4>
                                      <div className="font-black text-primary bg-primary/5 px-3 py-1 rounded-lg">{(prod.price).toLocaleString()} so'm</div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{prod.description || "Tavsif mavjud emas"}</p>
                                  </div>
                                <div className="mt-4 flex items-center justify-between border-t pt-4">
                                   <div className="flex items-center gap-2">
                                     {localProducts.find(p => p.aliposId === prod.id) ? (
                                        <Badge variant="secondary" className="bg-green-50 text-green-600 border-none rounded-lg px-2 py-1"><CheckCircle2 className="w-3 h-3 mr-1" /> FoodHub'da mavjud</Badge>
                                     ) : (
                                        <Badge variant="outline" className="text-gray-400 border-gray-200 rounded-lg px-2 py-1">Yang mahsulot</Badge>
                                     )}
                                   </div>
                                   <div className="text-[10px] font-mono bg-zinc-900 p-2 rounded-lg border border-zinc-800 mt-2 truncate max-w-full text-zinc-400">
                                      {(() => {
                                        const img = findAliPOSImage(prod);
                                        return `Found: ${img.length} | Images: ${prod.images?.length || 0} | URL: ${prod.imageUrl ? 'YES' : 'NO'} | Keys: ${Object.keys(prod).length}`;
                                      })()}
                                   </div>
                                   <div className="text-[10px] font-black text-gray-300 uppercase leading-none mt-2">ID: {prod.id.substring(0,8)}</div>
                                </div>
                              </div>
                            </Card>
                          ))}
                         </div>
                       </div>
                     )
                   })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="p-8 bg-zinc-950 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -mr-48 -mt-48 group-hover:bg-primary/30 transition-all duration-700"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
               <h3 className="text-2xl font-black mb-2">Buyurtmalar avtomatik sinxronlanadi</h3>
               <p className="text-zinc-400 max-w-lg">Sizning mijozlaringiz FoodHub orqali buyurtma berishsa, ular avtomatik ravishda AliPOS tizimingizga yuboriladi.</p>
            </div>
            <Button variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-2xl h-14 px-10 font-black tracking-tight" asChild>
               <a href="/admin/orders"><ExternalLink className="mr-2 h-5 w-5" /> Buyurtmalar paneliga o'tish</a>
            </Button>
         </div>
      </div>
    </div>
  )
}

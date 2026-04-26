"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getRestaurantCollection, getRestaurantDoc } from "@/lib/firebase-utils"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { useRestaurant } from "@/components/admin/restaurant-provider"
import { BookMenu } from "@/components/book-menu"
import { CategoryManagement } from "@/components/admin/category-management"
import { BannerManagement } from "@/components/admin/banner-management"
import { BookMenuAdmin } from "@/components/admin/book-menu-admin"
import { ScanMenuAdmin } from "@/components/admin/scan-menu-admin"
import { TvSettingsManagement } from "@/components/admin/tv-settings-management"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Search, Trash2, Edit, Loader2, LayoutGrid, List as ListIcon, AlertCircle, UtensilsCrossed, ChevronLeft, ChevronRight, BookOpen, ArrowUp, ArrowDown, GripVertical, Zap, Monitor, Check, X, Package, FileJson, Upload, Send } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MenuItem, Category } from "@/types"
import { optimizeImage } from "@/lib/image-optimizer"
import { PriceDisplay } from "@/components/price-display"
import { DiscountTimer } from "@/components/discount-timer"
import { ProductDetailDrawer } from "@/components/product-detail-drawer"
import { MenuItemForm } from "@/components/menu-item-form"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useRouter } from "next/navigation"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useLanguage } from "@/hooks/use-language"
import { LanguageSwitcher } from "@/components/language-switcher"
import { getLocalizedName, getLocalizedDescription } from "@/lib/localization"

const AdminMenuItemImage = ({ item, language, index }: { item: MenuItem; language: string; index: number }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = useMemo(() => {
    if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls;
    if (item.imageUrl) return [item.imageUrl];
    return [];
  }, [item.imageUrls, item.imageUrl]);



  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const [errorCount, setErrorCount] = useState<Record<number, boolean>>({});

  const handleImageError = (idx: number) => {
    setErrorCount(prev => ({ ...prev, [idx]: true }));
  };

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <UtensilsCrossed className="h-10 w-10 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group/admin-carousel">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const swipeThreshold = 50;
            if (info.offset.x < -swipeThreshold) {
              handleNext();
            } else if (info.offset.x > swipeThreshold) {
              handlePrev();
            }
          }}
          className="absolute inset-0"
        >
          <Image
            src={(() => {
              const rawImg = images[currentImageIndex];
              const urlStr = typeof rawImg === 'string' ? rawImg : (rawImg.url || rawImg.imageUrl || rawImg.image);
              return errorCount[currentImageIndex] ? urlStr : optimizeImage(rawImg, 400);
            })()}
            alt={getLocalizedName(item, language)}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110 pointer-events-none"
            loading="eager"
            priority={index < 8}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => handleImageError(currentImageIndex)}
          />
        </motion.div>
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <div className="absolute inset-y-0 left-0 flex items-center justify-center w-8 opacity-0 group-hover/admin-carousel:opacity-100 transition-opacity z-20">
            <button
              onClick={handlePrev}
              className="bg-white/40 backdrop-blur-md rounded-full p-1 text-black hover:bg-white/60 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center justify-center w-8 opacity-0 group-hover/admin-carousel:opacity-100 transition-opacity z-20">
            <button
              onClick={handleNext}
              className="bg-white/40 backdrop-blur-md rounded-full p-1 text-black hover:bg-white/60 transition-colors shadow-sm"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${currentImageIndex === i ? "w-3 bg-white shadow-sm" : "w-1 bg-white/40"
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export function MenuManagement() {
  const router = useRouter()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])

  // filteredItems is now derived via useMemo below
  const [platform, setPlatform] = useState("foothub")
  const [lastError, setLastError] = useState<any>(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [isAliPOSConnected, setIsAliPOSConnected] = useState<boolean | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<"all" | "low-stock" | "stop-list">("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isDeleteAliPOSDialogOpen, setIsDeleteAliPOSDialogOpen] = useState(false)
  const [isDeletingAliPOSData, setIsDeletingAliPOSData] = useState(false)

  const [errorCount, setErrorCount] = useState<Record<number, boolean>>({});
  const handleImageError = (index: number) => {
    setErrorCount(prev => ({ ...prev, [index]: true }));
  };
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Bulk stock update state
  const [bulkStockCategoryId, setBulkStockCategoryId] = useState<string | null>(null)
  const [bulkStockValue, setBulkStockValue] = useState<string>("")
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const [isJSONImportOpen, setIsJSONImportOpen] = useState(false)
  const [jsonInputValue, setJsonInputValue] = useState("")
  const [jsonImportType, setJsonImportType] = useState<"file" | "text">("file")

  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false)
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState("")

  const { toast } = useToast()
  const { t, language } = useLanguage()
  const { restaurantId } = useAuth()
  const { restaurant } = useRestaurant()

  // Navigation handlers for drawer
  const handleNext = () => {
    setSelectedItemIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % filteredItems.length;
    });
  };

  const handlePrev = () => {
    setSelectedItemIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + filteredItems.length) % filteredItems.length;
    });
  };

  // Stats derivation
  const stats = useMemo(() => {
    return {
      totalItems: menuItems.length,
      outOfStock: menuItems.filter(i => {
        const stock = i.remainingServings !== undefined ? Number(i.remainingServings) : null;
        return stock === 0 || !i.isAvailable;
      }).length,
      totalCategories: categories.length
    }
  }, [menuItems, categories])

  useEffect(() => {
    if (!restaurantId) return

    const categoriesQuery = query(getRestaurantCollection(restaurantId, "categories"), orderBy("name"))

    const categoriesUnsubscribe = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const categoriesData: Category[] = []
        snapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as Category)
        })
        setCategories(categoriesData)
      },
      (error) => {
        console.error("Error fetching categories:", error)
        toast({
          title: t("common.error"),
          description: t("admin.category.error"),
          variant: "destructive",
        })
      }
    )

    const menuQuery = query(getRestaurantCollection(restaurantId, "menuItems"))

    const menuUnsubscribe = onSnapshot(
      menuQuery,
      (snapshot) => {
        const items: MenuItem[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MenuItem));
        setMenuItems(items);

        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching menu items:", error)
        toast({
          title: t("common.error"),
          description: t("admin.menu.error"),
          variant: "destructive",
        })
        setIsLoading(false)
      }
    )

    return () => {
      categoriesUnsubscribe()
      menuUnsubscribe()
    }
  }, [toast, restaurantId])

  useEffect(() => {
    const checkAliPOS = async () => {
      if (!restaurant?.integrations?.alipos || !restaurantId) return
      try {
        const response = await fetch(`/api/integrations/alipos/check-status?resId=${restaurantId}`)
        const data = await response.json()
        setIsAliPOSConnected(data.connected)
      } catch {
        setIsAliPOSConnected(false)
      }
    }
    checkAliPOS()
    const interval = setInterval(checkAliPOS, 60000) // Re-check every minute
    return () => clearInterval(interval)
  }, [restaurant?.integrations?.alipos])

  const filteredItems = useMemo(() => {
    let result = menuItems

    if (searchQuery) {
      const q = searchQuery.toLowerCase() // Optimize case conversion
      result = result.filter(
        (item) =>
          getLocalizedName(item, language).toLowerCase().includes(q) ||
          getLocalizedDescription(item, language).toLowerCase().includes(q)
      )
    }

    if (categoryFilter && categoryFilter !== "all") {
      const selectedCategory = categories.find(c => c.id === categoryFilter);
      if (selectedCategory?.isDiscountCategory) {
        result = result.filter(
          (item) => item.discountEndsAt && new Date(item.discountEndsAt) > new Date()
        );
      } else {
        result = result.filter((item) => item.categoryId === categoryFilter);
      }
    }

    if (filterType === "low-stock") {
      result = result.filter(item => {
        const stock = item.remainingServings !== undefined && item.remainingServings !== null ? Number(item.remainingServings) : null;
        return stock !== null && stock <= 5 && stock > 0;
      })
    } else if (filterType === "stop-list") {
      result = result.filter(item => {
        const stock = item.remainingServings !== undefined && item.remainingServings !== null ? Number(item.remainingServings) : null;
        return stock === 0 || !item.isAvailable;
      })
    }

    // Sort items robustly
    result.sort((a, b) => {
      // 1. Group by Category Order first (so "All" view is organized)
      const catA = categories.find(c => c.id === a.categoryId);
      const catB = categories.find(c => c.id === b.categoryId);
      const catOrderA = catA?.order ?? 1000000;
      const catOrderB = catB?.order ?? 1000000;

      if (catOrderA !== catOrderB) return catOrderA - catOrderB;

      // 2. Sort by Item Order within category
      const orderA = a.order ?? 1000000;
      const orderB = b.order ?? 1000000;
      if (orderA !== orderB) return orderA - orderB;

      // 3. Fallback to creation date
      if (!a.createdAt || !b.createdAt) return 0;
      return b.createdAt.seconds - a.createdAt.seconds;
    });

    return result
  }, [menuItems, categories, categoryFilter, searchQuery, filterType, language])

  const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
    setDraggedItem(item)
    e.dataTransfer.setData("text/plain", item.id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (!draggedItem || !restaurantId) return

    const newIndex = index
    const oldIndex = filteredItems.findIndex(item => item.id === draggedItem.id)

    if (newIndex === oldIndex) return

    setIsSubmitting(true)
    try {
      const batch = writeBatch(db)
      const updatedItems = [...filteredItems]
      const [removed] = updatedItems.splice(oldIndex, 1)
      updatedItems.splice(newIndex, 0, removed)

      updatedItems.forEach((item, i) => {
        const ref = getRestaurantDoc(restaurantId, "menuItems", item.id)
        batch.update(ref, { order: i })
      })

      await batch.commit()
      toast({
        title: t("common.success"),
        description: t("admin.menu.reorderSuccess") || "Tartib yangilandi",
      })
    } catch (error) {
      console.error("Error reordering items:", error)
      toast({
        title: t("common.error"),
        description: t("admin.menu.reorderError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      handleDragEnd()
    }
  }

  const moveItem = async (itemId: string, direction: "up" | "down") => {
    if (!restaurantId || isSubmitting) return

    const index = filteredItems.findIndex(item => item.id === itemId)
    if (index === -1) return
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === filteredItems.length - 1) return

    const newIndex = direction === "up" ? index - 1 : index + 1
    
    setIsSubmitting(true)
    try {
      const batch = writeBatch(db)
      const itemA = filteredItems[index]
      const itemB = filteredItems[newIndex]

      batch.update(getRestaurantDoc(restaurantId, "menuItems", itemA.id), { order: newIndex })
      batch.update(getRestaurantDoc(restaurantId, "menuItems", itemB.id), { order: index })

      await batch.commit()
    } catch (error) {
      console.error("Error moving item:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkStockUpdate = async (categoryId: string) => {
    if (!restaurantId) return
    const parsed = parseInt(bulkStockValue, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast({ title: "Xato", description: "Iltimos, to'g'ri son kiriting (0 yoki undan katta)", variant: "destructive" })
      return
    }
    const itemsInCategory = menuItems.filter(i => i.categoryId === categoryId)
    if (itemsInCategory.length === 0) {
      toast({ title: "Taomlar topilmadi", description: "Bu kategoriyada taomlar mavjud emas", variant: "destructive" })
      return
    }
    setIsBulkUpdating(true)
    try {
      const batch = writeBatch(db)
      itemsInCategory.forEach(item => {
        const ref = getRestaurantDoc(restaurantId, "menuItems", item.id)
        batch.update(ref, { remainingServings: parsed, isAvailable: parsed > 0 })
      })
      await batch.commit()
      toast({
        title: "Muvaffaqiyatli yangilandi! ✅",
        description: `${itemsInCategory.length} ta taomda sotuvdagi soni ${parsed} ga o'zlashtirildi`,
      })
      setBulkStockCategoryId(null)
      setBulkStockValue("")
    } catch (err) {
      console.error("Bulk stock update error:", err)
      toast({ title: "Xatolik yuz berdi", description: "Iltimos qayta urinib ko'ring", variant: "destructive" })
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const handleAddItem = () => {
    setIsCreateDrawerOpen(true)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setIsEditDrawerOpen(true)
  }

  const handleDeleteClick = (item: MenuItem) => {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !restaurantId) return

    setIsDeleting(true)
    try {
      await deleteDoc(getRestaurantDoc(restaurantId, "menuItems", itemToDelete.id))
      toast({
        title: t("admin.menu.item.delete"),
        description: `${itemToDelete.name} ${t("admin.menu.item.deleteSuccess") || "muvaffaqiyatli o'chirildi"}`,
      })
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast({
        title: t("common.error"),
        description: t("admin.menu.deleteError") || "O'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? getLocalizedName(category, language) : t("common.noCategories")
  }

  const [activeTab, setActiveTab] = useState("menu-items")

  const syncWithAliPOS = async () => {
    if (!restaurant?.integrations?.alipos) {
      toast({
        title: "AliPOS sozlanmagan",
        description: "Integratsiyalash uchun AliPOS sahifasiga o'ting",
        variant: "destructive"
      })
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/integrations/alipos/sync-menu", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId })
      })
      const result = await response.json()
      if (result.success) {
        toast({
          title: "Sinxronizatsiya muvaffaqiyatli",
          description: "Menyu AliPOS bilan yangilandi"
        })
      } else {
        throw new Error(result.error || "Noma'lum xatolik")
      }
    } catch (error: any) {
      toast({
        title: "Sinxronizatsiyada xato",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAliPOSConfirm = async () => {
    if (!restaurantId) return
    setIsDeletingAliPOSData(true)
    try {
      const batch = writeBatch(db)
      
      // Filter menu items and categories that have aliposId
      const itemsToDelete = menuItems.filter(item => item.aliposId)
      const categoriesToDelete = categories.filter(cat => cat.aliposId)
      
      if (itemsToDelete.length === 0 && categoriesToDelete.length === 0) {
        toast({
          title: "Ma'lumot topilmadi",
          description: "AliPOS'dan integratsiya qilingan ma'lumotlar mavjud emas",
        })
        setIsDeleteAliPOSDialogOpen(false)
        return
      }

      itemsToDelete.forEach(item => {
        batch.delete(getRestaurantDoc(restaurantId, "menuItems", item.id))
      })
      
      categoriesToDelete.forEach(cat => {
        batch.delete(getRestaurantDoc(restaurantId, "categories", cat.id))
      })

      await batch.commit()
      
      toast({
        title: "Muvaffaqiyatli o'chirildi",
        description: `${itemsToDelete.length} ta mahsulot va ${categoriesToDelete.length} ta kategoriya o'chirildi`,
      })
      setIsDeleteAliPOSDialogOpen(false)
    } catch (error: any) {
      console.error("Error deleting AliPOS data:", error)
      toast({
        title: t("common.error"),
        description: "Ma'lumotlarni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsDeletingAliPOSData(false)
    }
  }

  const handleDeleteAllConfirm = async () => {
    if (!restaurantId || menuItems.length === 0 || deleteAllConfirmText !== "O'CHIRISH") return
    
    setIsDeleting(true)
    try {
      const chunks = []
      for (let i = 0; i < menuItems.length; i += 400) {
        chunks.push(menuItems.slice(i, i + 400))
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db)
        chunk.forEach((item) => {
          batch.delete(getRestaurantDoc(restaurantId, "menuItems", item.id))
        })
        await batch.commit()
      }

      toast({
        title: t("common.success"),
        description: t("admin.menu.deleteAllSuccess") || "Barcha taomlar muvaffaqiyatli o'chirildi",
      })
      setIsDeleteAllDialogOpen(false)
      setDeleteAllConfirmText("")
    } catch (error) {
      console.error("Error deleting all items:", error)
      toast({
        title: t("common.error"),
        description: t("admin.menu.deleteAllError") || "O'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const processJSONData = async (data: any) => {
    try {
      const items = Array.isArray(data) ? data : (data.items || [])
      const categoriesData = data.categories || []

      if (items.length === 0 && categoriesData.length === 0) {
        throw new Error("JSON bo'sh yoki noto'g'ri formatda")
      }

      setIsSubmitting(true)
      const batch = writeBatch(db)

      const categoryMap: Record<string, string> = {} 
      
      // Initialize categoryMap with existing categories
      categories.forEach(cat => {
        if (cat.name) categoryMap[cat.name] = cat.id
        if (cat.name_uz) categoryMap[cat.name_uz] = cat.id
        if (cat.name_ru) categoryMap[cat.name_ru] = cat.id
        if (cat.name_en) categoryMap[cat.name_en] = cat.id
      })

      // Map existing item names for duplicate checking
      const existingItemNames = new Set<string>()
      menuItems.forEach(item => {
        if (item.name) existingItemNames.add(item.name.trim().toLowerCase())
        if (item.name_uz) existingItemNames.add(item.name_uz.trim().toLowerCase())
        if (item.name_ru) existingItemNames.add(item.name_ru.trim().toLowerCase())
      })

      if (categoriesData.length > 0) {
        for (const cat of categoriesData) {
          const catRef = doc(getRestaurantCollection(restaurantId!, "categories"))
          const catData = {
            ...cat,
            createdAt: serverTimestamp(),
            order: cat.order || 0
          }
          batch.set(catRef, catData)
          categoryMap[cat.name || cat.id] = catRef.id
          // Also map localized names if provided in JSON
          if (cat.name_uz) categoryMap[cat.name_uz] = catRef.id
          if (cat.name_ru) categoryMap[cat.name_ru] = catRef.id
        }
      }

      let addedItemsCount = 0
      let skippedItemsCount = 0

      for (const item of items) {
        const itemName = item.name?.trim().toLowerCase()
        if (itemName && existingItemNames.has(itemName)) {
          skippedItemsCount++
          continue
        }

        const itemRef = doc(getRestaurantCollection(restaurantId!, "menuItems"))
        
        const itemData: any = {
          ...item,
          isAvailable: item.isAvailable !== false,
          remainingServings: item.remainingServings !== undefined ? Number(item.remainingServings) : (item.isAvailable === false ? 0 : 999),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          order: item.order || 0
        }

        // Map description to localized fields if they are missing
        if (item.description) {
          if (!item.description_uz) itemData.description_uz = item.description
          if (!item.description_ru) itemData.description_ru = item.description
        }

        // Map name to localized fields if they are missing
        if (item.name) {
          if (!item.name_uz) itemData.name_uz = item.name
          if (!item.name_ru) itemData.name_ru = item.name
        }

        // Map 'photo' to 'imageUrl' and 'imageUrls'
        if (item.photo) {
          const photoUrl = typeof item.photo === 'string' ? item.photo : (item.photo.url || item.photo.imageUrl);
          if (photoUrl) {
            itemData.imageUrl = photoUrl
            itemData.imageUrls = [photoUrl]
          }
        }

        if (Array.isArray(item.variants)) {
          itemData.variants = item.variants.map((v: any) => ({
            ...v,
            id: v.id || Math.random().toString(36).substr(2, 9)
          }))
        } else {
          delete itemData.variants
        }

        if (item.categoryName) {
          const normalizedName = item.categoryName.trim().toLowerCase()
          let foundId = categoryMap[item.categoryName] || categoryMap[normalizedName]
          
          // Try to find in existing categories by any language
          if (!foundId) {
            const existingCat = categories.find(c => 
              c.name?.toLowerCase() === normalizedName || 
              c.name_uz?.toLowerCase() === normalizedName || 
              c.name_ru?.toLowerCase() === normalizedName
            )
            if (existingCat) foundId = existingCat.id
          }

          if (foundId) {
            itemData.categoryId = foundId
          } else {
            // Auto-create category if not found
            const catRef = doc(getRestaurantCollection(restaurantId!, "categories"))
            const newCatData = {
              name: item.categoryName,
              name_uz: item.categoryName,
              createdAt: serverTimestamp(),
              order: categories.length + 1
            }
            batch.set(catRef, newCatData)
            categoryMap[item.categoryName] = catRef.id
            categoryMap[normalizedName] = catRef.id
            itemData.categoryId = catRef.id
          }
          delete itemData.categoryName
        }

        batch.set(itemRef, itemData)
        addedItemsCount++
      }

      await batch.commit()
      toast({
        title: "Muvaffaqiyatli! ✅",
        description: `${addedItemsCount} ta yangi taom qo'shildi. ${skippedItemsCount} ta takroriy taom o'tkazib yuborildi.`,
      })
      setIsJSONImportOpen(false)
      setJsonInputValue("")
    } catch (error: any) {
      console.error("JSON Import Error:", error)
      toast({
        title: "Xatolik",
        description: "JSON formatini tekshiring: " + error.message,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJSONFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        await processJSONData(data)
      } catch (error: any) {
        toast({
          title: "Xatolik",
          description: "Faylni o'qishda xato: " + error.message,
          variant: "destructive"
        })
      } finally {
        e.target.value = "" 
      }
    }
    reader.readAsText(file)
  }

  const handleJSONTextSubmit = async () => {
    if (!jsonInputValue.trim()) return
    try {
      const data = JSON.parse(jsonInputValue)
      await processJSONData(data)
    } catch (error: any) {
      toast({
        title: "Format xato",
        description: "JSON formatini tekshiring",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] -m-2 md:m-0 text-slate-900 font-sans">
      <div className="w-full space-y-6 md:space-y-10 pb-20 md:pb-12">

        {/* --- PREMIUM STICKY HEADER --- */}
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 px-6 py-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <UtensilsCrossed className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  {restaurant?.menuStyle === 'book'
                    ? "Kitob Menyu"
                    : restaurant?.menuStyle === 'scan'
                      ? "Skanerlangan Menyu"
                      : t("admin.menu.title")}
                </h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Professional Boshqaruv</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {restaurant?.integrations?.alipos && (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    isAliPOSConnected === true ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : 
                    isAliPOSConnected === false ? "bg-red-500" : "bg-gray-300"
                  )} title={isAliPOSConnected ? "AliPOS Connected" : "AliPOS Disconnected"} />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={syncWithAliPOS}
                    disabled={isSubmitting}
                    className="rounded-xl border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 transition-all font-bold h-11 px-6 active:scale-95"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    AliPOS Sync
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsDeleteAliPOSDialogOpen(true)}
                    disabled={isSubmitting || isDeletingAliPOSData}
                    className="rounded-xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-600 transition-all font-bold h-11 w-11 active:scale-95"
                    title="AliPOS ma'lumotlarini o'chirish"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              )}
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsJSONImportOpen(true)}
                className="rounded-xl border-2 border-amber-100 hover:border-amber-500 hover:bg-amber-50 text-amber-600 transition-all font-bold h-11 w-11 active:scale-95 cursor-pointer"
                title="JSON Import"
              >
                <FileJson className="w-5 h-5" />
              </Button>
              {restaurant?.menuStyle !== 'scan' && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setIsDeleteAllDialogOpen(true)}
                    disabled={isDeleting || menuItems.length === 0}
                    className="rounded-xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50 text-red-600 transition-all font-bold h-11 px-4 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Tozalash
                  </Button>
                  <Button 
                    onClick={handleAddItem} 
                    className="shadow-xl shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 px-8 font-black transition-all active:scale-95"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    {t("admin.menu.addItem")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full px-4 md:px-8 xl:px-12 space-y-10 transition-all duration-300">
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10 w-full">
            {restaurant?.menuStyle !== 'scan' && (
              <div className="flex justify-center">
                <TabsList className="bg-slate-100/80 p-1 rounded-2xl border shadow-inner h-14 w-full md:w-[600px]">
                  <TabsTrigger value="menu-items" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all font-bold text-sm">
                    {restaurant?.menuStyle === 'book' ? "Tuzilma" : t("admin.menu.tabs.menu")}
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all font-bold text-sm">
                    {t("admin.menu.tabs.categories")}
                  </TabsTrigger>
                  <TabsTrigger value="banners" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all font-bold text-sm">
                    {t("admin.menu.tabs.banners")}
                  </TabsTrigger>
                  <TabsTrigger value="tv-settings" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-xl transition-all font-bold text-sm gap-2">
                    <Monitor className="w-4 h-4" /> TV
                  </TabsTrigger>
                </TabsList>
              </div>
            )}

            {/* --- RICH STATS CARDS --- */}
            {restaurant?.menuStyle !== 'scan' && activeTab === "menu-items" && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {[
                  { label: "Barcha Taomlar", value: stats.totalItems, icon: <UtensilsCrossed />, color: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/20" },
                  { label: "Tugatilganlar", value: stats.outOfStock, icon: <AlertCircle />, color: "from-rose-500 to-red-600", shadow: "shadow-rose-500/20" },
                  { label: "Kategoriyalar", value: stats.totalCategories, icon: <LayoutGrid />, color: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/20" }
                ].map((stat, i) => (
                  <Card key={i} className={cn("border-none shadow-2xl rounded-[2.5rem] overflow-hidden group hover:-translate-y-1 transition-all duration-300", stat.shadow)}>
                    <CardContent className="p-8 flex items-center gap-6 relative">
                      <div className={cn("w-16 h-16 rounded-3xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:rotate-6", stat.color)}>
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-4xl font-black text-slate-900 mt-1">{stat.value}</h3>
                      </div>
                      <div className="absolute right-0 bottom-0 opacity-5 -mb-6 -mr-6 scale-150 transform rotate-12">
                        {stat.icon}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            )}

            <TabsContent value="menu-items" className="space-y-10 animate-in fade-in duration-500">
              {restaurant?.menuStyle === 'book' ? (
                <ScanMenuAdmin restaurant={restaurant} isBookStyle={true} />
              ) : restaurant?.menuStyle === 'scan' ? (
                <ScanMenuAdmin restaurant={restaurant} />
              ) : (
                <>
                  {/* --- ADVANCED TOOLBAR --- */}
                  <div className="flex flex-col gap-6 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder={t("admin.menu.toolbar.search")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-12 h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 transition-all w-full text-lg font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100/80 p-1.5 rounded-2xl border flex gap-1">
                          {[
                            { id: "grid", icon: <LayoutGrid className="w-5 h-5" /> },
                            { id: "list", icon: <ListIcon className="w-5 h-5" /> }
                          ].map(mode => (
                            <Button
                              key={mode.id}
                              variant={viewMode === mode.id ? "secondary" : "ghost"}
                              size="icon"
                              onClick={() => setViewMode(mode.id as any)}
                              className={cn(
                                "w-11 h-11 rounded-xl transition-all",
                                viewMode === mode.id ? "bg-white shadow-md text-indigo-600" : "text-slate-500"
                              )}
                            >
                              {mode.icon}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    {/* Category Filter: Select & Pills */}
                    <div className="flex flex-col xl:flex-row items-center gap-4 py-2">
                      {/* Select Dropdown for Categories */}
                      <div className="w-full xl:w-64 shrink-0">
                        <Select value={categoryFilter || "all"} onValueChange={(val) => setCategoryFilter(val)}>
                          <SelectTrigger className="w-full h-12 rounded-2xl bg-white border-slate-200 shadow-sm transition-all focus:ring-indigo-500 font-medium">
                            <div className="flex items-center gap-2">
                              <LayoutGrid className="w-4 h-4 text-indigo-500" />
                              <SelectValue placeholder={t("admin.menu.tabs.categories")} />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl shadow-xl">
                            <SelectItem value="all" className="rounded-xl font-medium cursor-pointer py-2.5">
                              {t("common.all")}
                            </SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="rounded-xl font-medium cursor-pointer py-2.5">
                                {getLocalizedName(category, language)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Scrollable Pills */}
                      <ScrollArea className="flex-1 min-w-0 w-full">
                        <div className="flex gap-3 w-max px-1 pb-4">
                          <Button
                            variant={categoryFilter === "all" || !categoryFilter ? "default" : "outline"}
                            onClick={() => setCategoryFilter("all")}
                            className={cn(
                              "rounded-2xl px-8 h-12 font-bold transition-all active:scale-95 shadow-sm shrink-0",
                              (categoryFilter === "all" || !categoryFilter) 
                                ? "bg-indigo-600 shadow-indigo-500/20 ring-2 ring-indigo-600/20 ring-offset-1" 
                                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                            )}
                          >
                            {t("common.all")}
                          </Button>
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center gap-1 shrink-0">
                              <Button
                                variant={categoryFilter === category.id ? "default" : "outline"}
                                onClick={() => setCategoryFilter(category.id)}
                                className={cn(
                                  "rounded-2xl px-8 h-12 font-bold transition-all active:scale-95 shadow-sm",
                                  categoryFilter === category.id 
                                    ? "bg-indigo-600 shadow-indigo-500/20 ring-2 ring-indigo-600/20 ring-offset-1" 
                                    : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                                )}
                              >
                                {getLocalizedName(category, language)}
                              </Button>

                              {/* Bulk stock update trigger */}
                              {bulkStockCategoryId === category.id ? (
                                <div className="flex items-center gap-1 bg-white border border-indigo-300 rounded-2xl px-2 py-1 shadow-md animate-in slide-in-from-left-2 duration-200">
                                  <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <input
                                    type="number"
                                    min={0}
                                    autoFocus
                                    value={bulkStockValue}
                                    onChange={(e) => setBulkStockValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleBulkStockUpdate(category.id)
                                      if (e.key === "Escape") { setBulkStockCategoryId(null); setBulkStockValue("") }
                                    }}
                                    placeholder="soni"
                                    className="w-14 h-7 text-center text-sm font-bold border-0 outline-none bg-transparent text-slate-800 placeholder:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <button
                                    onClick={() => handleBulkStockUpdate(category.id)}
                                    disabled={isBulkUpdating}
                                    className="w-6 h-6 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-50"
                                  >
                                    {isBulkUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  </button>
                                  <button
                                    onClick={() => { setBulkStockCategoryId(null); setBulkStockValue("") }}
                                    className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  title={`${getLocalizedName(category, language)} - barcha taomlarda sotuvdagi sonini birga o'zgartirish`}
                                  onClick={() => { setBulkStockCategoryId(category.id); setBulkStockValue("") }}
                                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center text-slate-500 transition-colors border border-slate-200 hover:border-indigo-300"
                                >
                                  <Package className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="h-2.5 rounded-full" />
                      </ScrollArea>
                    </div>

                    {/* Stock Filters */}
                    <div className="flex gap-2 border-t pt-3">
                      <Button
                        variant={filterType === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType("all")}
                        className={cn(
                          "rounded-full px-4 h-8 text-[11px] font-bold transition-all",
                          filterType === "all" ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-500 border-slate-200"
                        )}
                      >
                        Hammasi
                      </Button>
                      <Button
                        variant={filterType === "low-stock" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType("low-stock")}
                        className={cn(
                          "rounded-full px-4 h-8 text-[11px] font-bold gap-1.5 transition-all",
                          filterType === "low-stock" ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20" : "text-orange-600 border-orange-200 hover:bg-orange-50"
                        )}
                      >
                        <AlertCircle className="w-3 h-3" />
                        Kam qolganlar
                      </Button>
                      <Button
                        variant={filterType === "stop-list" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType("stop-list")}
                        className={cn(
                          "rounded-full px-4 h-8 text-[11px] font-bold gap-1.5 transition-all",
                          filterType === "stop-list" ? "bg-red-500 border-red-500 text-white shadow-md shadow-red-500/20" : "text-red-600 border-red-200 hover:bg-red-50"
                        )}
                      >
                        <Trash2 className="w-3 h-3" />
                        Stop-list
                      </Button>
                    </div>
                  </div>

                  {/* Content Area */}
                  {isLoading ? (
                    <div className="flex h-60 items-center justify-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center bg-white/50">
                      <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900">{t("admin.menu.empty.title")}</h3>
                      <p className="text-gray-500 mb-4">{t("admin.menu.empty.desc")}</p>
                      <Button
                        variant="outline"
                        onClick={() => setCategoryFilter("all")}
                        className="mt-2"
                      >
                        {t("admin.menu.empty.clear")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                          {filteredItems.map((item, index) => (
                            <Card
                              key={item.id}
                              draggable={categoryFilter && categoryFilter !== 'all' && !searchQuery}
                              onDragStart={(e) => handleDragStart(e, item)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDrop={(e) => handleDrop(e, index)}
                              className={cn(
                                "overflow-hidden group hover:shadow-lg transition-all duration-300 border-gray-200 relative",
                                draggedItem?.id === item.id ? "opacity-30 scale-95 border-primary bg-primary/5" : "",
                                dragOverIndex === index ? "border-primary shadow-xl scale-[1.02] bg-primary/5" : "",
                                (!categoryFilter || categoryFilter === 'all' || searchQuery) ? "" : "cursor-move"
                              )}
                            >
                              <div
                                className="relative aspect-[4/3] bg-gray-100 overflow-hidden cursor-pointer"
                                onClick={() => setSelectedItemIndex(index)}
                              >
                                <AdminMenuItemImage item={item} language={language} index={index} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                {item.discountEndsAt && new Date(item.discountEndsAt) > new Date() && (
                                  <div className="absolute top-2 left-2 z-20">
                                    <DiscountTimer endsAt={item.discountEndsAt} className="text-[10px] px-2 py-1 bg-white/95 backdrop-blur-sm shadow-md font-bold text-red-600" />
                                  </div>
                                )}

                                {/* Reorder Controls */}
                                {categoryFilter && categoryFilter !== 'all' && !searchQuery && (
                                  <div className="absolute right-2 top-2 z-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8 rounded-full shadow-lg"
                                      onClick={(e) => { e.stopPropagation(); moveItem(item.id, "up"); }}
                                      disabled={index === 0}
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="secondary"
                                      className="h-8 w-8 rounded-full shadow-lg"
                                      onClick={(e) => { e.stopPropagation(); moveItem(item.id, "down"); }}
                                      disabled={index === filteredItems.length - 1}
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}

                                {item.isAliPOS && (
                                  <div className="absolute bottom-2 left-2 z-20">
                                    <Badge variant="secondary" className="text-[10px] bg-indigo-600 text-white border-0 shadow-md gap-1">
                                      <Zap className="w-3 h-3" /> AliPOS
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              <CardContent className="p-3 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm leading-tight" title={getLocalizedName(item, language)}>
                                      {getLocalizedName(item, language)}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{getCategoryName(item.categoryId)}</p>
                                  </div>
                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-1 shrink-0 bg-white/50 backdrop-blur-sm rounded-lg p-0.5">
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex items-end justify-between mt-1">
                                  {/* Price */}
                                  <div>
                                      {item.variants && item.variants.length > 0 ? (
                                        <div className="font-bold text-sm text-gray-900 leading-none">
                                          {(() => {
                                            const prices = item.variants.map(v => v.price);
                                            const min = Math.min(...prices);
                                            return `${formatCurrency(min)}+`;
                                          })()}
                                        </div>
                                      ) : (
                                        <PriceDisplay
                                          price={item.price}
                                          discountPrice={(item.discountEndsAt && new Date(item.discountEndsAt) > new Date()) ? item.discountPrice : undefined}
                                          className="font-bold text-sm leading-none"
                                        />
                                      )}
                                  </div>

                                  {/* Availability / Stock */}
                                  <div className="flex items-center">
                                    {!item.isAvailable ? (
                                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shadow-none border-0 font-semibold uppercase">Stop!</Badge>
                                    ) : (item.remainingServings !== undefined && item.remainingServings !== null && item.remainingServings >= 0) ? (
                                      <Badge variant={item.remainingServings <= 5 ? "destructive" : "secondary"} className={cn("text-[10px] px-1.5 py-0 shadow-none border-0 font-bold whitespace-nowrap", item.remainingServings <= 5 ? "" : "bg-emerald-100 text-emerald-700")}>
                                        {item.remainingServings} ta qoldi
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 shadow-none border-0 font-bold whitespace-nowrap">Mavjud</Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="w-[80px] font-bold text-gray-900">{t("admin.menu.table.image") || "Rasm"}</TableHead>
                                <TableHead className="font-bold text-gray-900">{t("admin.menu.table.name") || "Nomi"}</TableHead>
                                <TableHead className="font-bold text-gray-900">{t("admin.menu.table.category") || "Kategoriya"}</TableHead>
                                <TableHead className="font-bold text-gray-900">{t("admin.menu.table.price") || "Narxi"}</TableHead>
                                <TableHead className="font-bold text-gray-900">{t("admin.form.scheduling.availableDays") || "Sotuv kunlari"}</TableHead>
                                <TableHead className="font-bold text-gray-900">{t("admin.menu.table.available") || "Mavjud"}</TableHead>
                                <TableHead className="w-[120px] font-bold text-gray-900">{t("admin.category.order") || "Tartib"}</TableHead>
                                <TableHead className="text-right font-bold text-gray-900">{t("admin.menu.item.actions") || "Amallar"}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredItems.map((item, index) => (
                                <TableRow
                                  key={item.id}
                                  draggable={categoryFilter && categoryFilter !== 'all'}
                                  onDragStart={(e) => handleDragStart(e, item)}
                                  onDragEnd={handleDragEnd}
                                  onDragOver={(e) => handleDragOver(e, index)}
                                  onDrop={(e) => handleDrop(e, index)}
                                  className={cn(
                                    "hover:bg-gray-50/50 cursor-move transition-all",
                                    draggedItem?.id === item.id ? "opacity-30 bg-muted" : "",
                                    dragOverIndex === index ? "bg-primary/5 border-b-2 border-b-primary" : ""
                                  )}
                                >
                                  <TableCell>
                                    <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                                      {(() => {
                                        const imgUrl = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : item.imageUrl;
                                        if (!imgUrl) return (
                                          <div className="flex h-full items-center justify-center text-gray-400">
                                            <UtensilsCrossed className="h-4 w-4" />
                                          </div>
                                        );
                                        return (
                                          <Image 
                                            src={errorCount[index + 1000] ? imgUrl : optimizeImage(imgUrl, 100)} 
                                            alt={getLocalizedName(item, language)} 
                                            fill 
                                            className="object-cover"
                                            onError={() => handleImageError(index + 1000)}
                                          />
                                        );
                                      })()}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div>{getLocalizedName(item, language)}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{getLocalizedDescription(item, language)}</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-normal">
                                      {getCategoryName(item.categoryId)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-border/50 shadow-sm inline-block min-w-[100px]">
                                      {item.variants && item.variants.length > 0 ? (
                                        <span className="font-bold text-sm text-gray-900 block truncate max-w-[120px]">
                                          {(() => {
                                            const prices = item.variants.map(v => v.price);
                                            const min = Math.min(...prices);
                                            const max = Math.max(...prices);
                                            if (min === max) return formatCurrency(min);
                                            return `${formatCurrency(min)} - ${formatCurrency(max)}`;
                                          })()}
                                        </span>
                                      ) : (
                                        <PriceDisplay
                                          price={item.price}
                                          discountPrice={(item.discountEndsAt && new Date(item.discountEndsAt) > new Date()) ? item.discountPrice : undefined}
                                          className="font-bold text-sm"
                                        />
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                      {!item.availableDays || item.availableDays.length === 7 ? (
                                        <span className="text-[10px] text-zinc-400 font-medium italic">
                                          {language === 'uz' ? 'Har kuni' : language === 'ru' ? 'Ежедневно' : 'Daily'}
                                        </span>
                                      ) : (
                                        [1, 2, 3, 4, 5, 6, 0]
                                          .filter(d => item.availableDays?.includes(d))
                                          .map(day => (
                                            <Badge
                                              key={day}
                                              variant="secondary"
                                              className="text-[9px] px-1.5 py-0 h-4 font-bold bg-blue-50 text-blue-600 border-blue-100"
                                            >
                                              {t(`admin.form.scheduling.days.${day}`).substring(0, 3)}
                                            </Badge>
                                          ))
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                  <div className="flex flex-col gap-1">
                                      <Badge variant={item.isAvailable && (item.remainingServings === undefined || item.remainingServings > 0) ? "default" : "secondary"} className={(!item.isAvailable || item.remainingServings === 0) ? "bg-gray-200 text-gray-500 hover:bg-gray-200" : ""}>
                                        {item.isAvailable && (item.remainingServings === undefined || item.remainingServings > 0) ? t("admin.menu.item.available") : t("admin.menu.item.stop")}
                                      </Badge>
                                      {item.remainingServings !== undefined && item.remainingServings !== null && (
                                        <Badge variant="outline" className={cn(
                                          "text-[9px] px-1.5 py-0 h-4 font-bold border-0",
                                          item.remainingServings <= 5 ? "text-orange-600 bg-orange-50" : "text-blue-600 bg-blue-50"
                                        )}>
                                          {item.remainingServings} dona qoldi
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); moveItem(item.id, "up"); }}
                                        disabled={isSubmitting || index === 0 || !categoryFilter || categoryFilter === 'all' || !!searchQuery.trim()}
                                        className={cn(
                                          "h-8 w-8 rounded-full bg-white shadow-sm hover:bg-gray-50 border-gray-200 transition-all",
                                          isSubmitting && "opacity-50"
                                        )}
                                        title={t("admin.category.moveUp") || "Yuqoriga"}
                                      >
                                        {isSubmitting ? (
                                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        ) : (
                                          <ArrowUp className="h-4 w-4 text-gray-600" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={(e) => { e.stopPropagation(); moveItem(item.id, "down"); }}
                                        disabled={isSubmitting || index === filteredItems.length - 1 || !categoryFilter || categoryFilter === 'all' || !!searchQuery.trim()}
                                        className={cn(
                                          "h-8 w-8 rounded-full bg-white shadow-sm hover:bg-gray-50 border-gray-200 transition-all",
                                          isSubmitting && "opacity-50"
                                        )}
                                        title={t("admin.category.moveDown") || "Pastga"}
                                      >
                                        {isSubmitting ? (
                                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                        ) : (
                                          <ArrowDown className="h-4 w-4 text-gray-600" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                                        <Edit className="h-4 w-4 text-gray-500" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </TabsContent>

          <TabsContent value="categories">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="banners" className="animate-in fade-in duration-500">
            <BannerManagement restaurantId={restaurantId} categories={categories} />
          </TabsContent>

          <TabsContent value="tv-settings" className="animate-in fade-in duration-500">
            <TvSettingsManagement restaurantId={restaurantId} categories={categories} slug={restaurant?.slug} />
          </TabsContent>
        </Tabs>

        {/* Product Detail Drawer */}
        <ProductDetailDrawer
          item={selectedItemIndex !== null ? filteredItems[selectedItemIndex] : null}
          isOpen={selectedItemIndex !== null}
          onClose={() => setSelectedItemIndex(null)}
          onNext={handleNext}
          onPrev={handlePrev}
          isAdmin={true}
          onEdit={() => selectedItemIndex !== null && handleEditItem(filteredItems[selectedItemIndex])}
          onDelete={() => selectedItemIndex !== null && handleDeleteClick(filteredItems[selectedItemIndex])}
        />

        {/* Create Item Drawer */}
        <Drawer open={isCreateDrawerOpen} onOpenChange={setIsCreateDrawerOpen}>
          <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] border-0 outline-none flex flex-col bg-gray-50/95 backdrop-blur-sm">
            <DrawerTitle className="sr-only">{t("admin.menu.addItem")}</DrawerTitle>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
              <MenuItemForm
                categories={categories}
                onSuccess={() => setIsCreateDrawerOpen(false)}
                onCancel={() => setIsCreateDrawerOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Edit Item Drawer */}
        <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
          <DrawerContent className="max-h-[96vh] h-full rounded-t-[30px] border-0 outline-none flex flex-col bg-gray-50/95 backdrop-blur-sm">
            <DrawerTitle className="sr-only">{t("admin.menu.item.edit")}</DrawerTitle>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
              {editingItem && (
                <MenuItemForm
                  key={editingItem.id}
                  item={editingItem}
                  categories={categories}
                  onSuccess={() => { setIsEditDrawerOpen(false); setEditingItem(null); }}
                  onCancel={() => { setIsEditDrawerOpen(false); setEditingItem(null); }}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Delete Dialog */}
        {/* Advanced JSON Import Dialog */}
        <Dialog open={isJSONImportOpen} onOpenChange={setIsJSONImportOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-amber-600" />
                JSON orqali menyu yuklash
              </DialogTitle>
              <DialogDescription>
                JSON fayl yuklang yoki kodni pastga joylashtiring. Variantli mahsulotlar ham qo'llab-quvvatlanadi.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={jsonImportType} onValueChange={(val) => setJsonImportType(val as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="file">Fayl yuklash</TabsTrigger>
                <TabsTrigger value="text">Kod yozish (Paste)</TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-amber-400 transition-colors group">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleJSONFileImport}
                    className="hidden"
                    id="json-file-input"
                  />
                  <label htmlFor="json-file-input" className="cursor-pointer flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">JSON faylni tanlang</p>
                      <p className="text-sm text-slate-400">Yoki faylni bu yerga tashlang</p>
                    </div>
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <Textarea
                  placeholder='{"items": [{"name": "Osh", "price": 35000}]}'
                  className="h-64 font-mono text-xs rounded-xl"
                  value={jsonInputValue}
                  onChange={(e) => setJsonInputValue(e.target.value)}
                />
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 h-12 rounded-xl font-bold"
                  onClick={handleJSONTextSubmit}
                  disabled={isSubmitting || !jsonInputValue.trim()}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Ma'lumotlarni yuborish
                </Button>
              </TabsContent>
            </Tabs>
            
            <div className="bg-slate-50 p-4 rounded-xl space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eslatma:</p>
              <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                <li>JSON formati to'g'ri ekanligiga ishonch hosil qiling.</li>
                <li>`variants` massivi orqali variantlarni qo'shish mumkin.</li>
                <li>Kategoriyalar avtomatik nomi bo'yicha bog'lanadi.</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>

        {/* Existing Dialogs */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.menu.item.deleteTitle")}</DialogTitle>
              <DialogDescription>
                {t("admin.menu.item.deleteDesc")} <b>{itemToDelete?.name}</b>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                {t("admin.form.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t("admin.menu.item.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete AliPOS Data Dialog */}
        <Dialog open={isDeleteAliPOSDialogOpen} onOpenChange={setIsDeleteAliPOSDialogOpen}>
          <DialogContent className="rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-900">AliPOS Ma'lumotlarini O'chirish</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium pt-2">
                AliPOS'dan integratsiya qilingan barcha <span className="text-red-600 font-bold">{menuItems.filter(i => i.aliposId).length} ta mahsulot</span> va <span className="text-red-600 font-bold">{categories.filter(c => c.aliposId).length} ta kategoriya</span> butunlay o'chiriladi. Lokal kiritilgan ma'lumotlar o'zgarmasdan qoladi.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3 sm:gap-0 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteAliPOSDialogOpen(false)} 
                disabled={isDeletingAliPOSData}
                className="rounded-2xl h-12 px-6 font-bold text-slate-600 border-slate-200 hover:bg-slate-50 transition-all"
              >
                {t("admin.form.cancel")}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAliPOSConfirm} 
                disabled={isDeletingAliPOSData}
                className="rounded-2xl h-12 px-8 font-black shadow-xl shadow-red-500/20 active:scale-95 transition-all"
              >
                {isDeletingAliPOSData ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Trash2 className="mr-2 h-5 w-5" />}
                O'chirishni tasdiqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Delete All Items Confirmation Dialog */}
        <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
          <DialogContent className="rounded-[2.5rem] max-w-md">
            <DialogHeader>
              <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center mb-4 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-black text-slate-900 text-center">Xavfli amal!</DialogTitle>
              <DialogDescription className="text-slate-500 font-medium text-center pt-2">
                Haqiqatan ham barcha <span className="text-red-600 font-bold">{menuItems.length} ta taomni</span> butunlay o'chirib tashlamoqchimisiz?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-slate-600 text-center">Tasdiqlash uchun pastga <span className="font-bold text-red-600">O'CHIRISH</span> so'zini yozing:</p>
              <Input
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                placeholder="O'CHIRISH"
                className="h-12 rounded-xl text-center font-bold border-red-200 focus:border-red-500 transition-all uppercase"
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => { setIsDeleteAllDialogOpen(false); setDeleteAllConfirmText(""); }} 
                className="flex-1 rounded-xl h-12 font-bold"
              >
                Bekor qilish
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAllConfirm}
                disabled={isDeleting || deleteAllConfirmText !== "O'CHIRISH"}
                className="flex-1 rounded-xl h-12 font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                {isDeleting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Trash2 className="mr-2 h-5 w-5" />}
                HA, HAMMASINI O'CHIRISH
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </div>
  )
}

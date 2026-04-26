"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { doc, getDoc, collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AlertCircle } from "lucide-react"
import ModelViewer from "@/components/3d-model-viewer"
import { useToast } from "@/components/ui/use-toast"
import type { MenuItem } from "@/types"
import { motion, AnimatePresence } from "framer-motion"

export default function ThreeDViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [item, setItem] = useState<MenuItem | null>(null)
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchItemAndRestaurant = async () => {
      try {
        if (!params.itemId) {
          setError("Mahsulot ID topilmadi")
          setLoading(false)
          return
        }

        const itemId = params.itemId as string;
        const restaurantIdHint = searchParams.get("r");

        let docSnap = null;
        let foundRestaurantId = restaurantIdHint;

        // 1. Try with restaurant ID hint if provided
        if (foundRestaurantId) {
          const directDoc = await getDoc(doc(db, "restaurants", foundRestaurantId, "menuItems", itemId));
          if (directDoc.exists()) {
            docSnap = directDoc;
          }
        }

        // 2. Try root collection (fallback)
        if (!docSnap) {
          const rootDoc = await getDoc(doc(db, "menuItems", itemId));
          if (rootDoc.exists()) {
            docSnap = rootDoc;
          }
        }

        // 3. Search across all restaurants
        if (!docSnap) {
          const restaurantsSnapshot = await getDocs(collection(db, "restaurants"));
          const findPromises = restaurantsSnapshot.docs.map(resDoc => 
            getDoc(doc(db, "restaurants", resDoc.id, "menuItems", itemId))
          );
          
          const results = await Promise.all(findPromises);
          const foundIndex = results.findIndex(d => d.exists());
          if (foundIndex !== -1) {
            docSnap = results[foundIndex];
            foundRestaurantId = restaurantsSnapshot.docs[foundIndex].id;
          }
        }

        if (!docSnap || !docSnap.exists()) {
          setError("Mahsulot topilmadi")
          setLoading(false)
          return
        }

        // Fetch Restaurant Data (Slug & Primary Color)
        if (foundRestaurantId) {
          const resDoc = await getDoc(doc(db, "restaurants", foundRestaurantId));
          if (resDoc.exists()) {
            const resData = resDoc.data();
            setRestaurantSlug(resData.slug || null);
            setPrimaryColor(resData.primaryColor || null);
          }
        }

        const itemData = docSnap.data()
        const menuItem: MenuItem = {
          id: docSnap.id,
          name: itemData.name_uz || itemData.name || "Noma'lum mahsulot",
          description: itemData.description_uz || itemData.description || "",
          price: typeof itemData.price === "number" ? itemData.price : 0,
          category: itemData.category || "",
          categoryId: itemData.categoryId || "",
          image: itemData.imageUrl || itemData.image || "/placeholder.svg",
          imageUrl: itemData.imageUrl || itemData.image || "/placeholder.svg",
          available: itemData.isAvailable !== false,
          isAvailable: itemData.isAvailable !== false,
          modelUrl: itemData.modelUrl || null,
        }

        setItem(menuItem)
        
        if (!menuItem.modelUrl) {
          toast({
            title: "Model mavjud emas",
            description: "Ushbu mahsulot uchun 3D model biriktirilmagan",
            variant: "destructive"
          })
        }
      } catch (err: any) {
        console.error("Error fetching item:", err)
        setError("Ma'lumotlarni yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchItemAndRestaurant()
  }, [params.itemId, searchParams, toast])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
            <div className="absolute top-0 w-16 h-16 border-4 border-primary rounded-full border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
            </div>
          </div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-white/80 font-bold tracking-widest uppercase text-xs">Menu 3D Engine</p>
            <p className="text-white/40 text-[10px] mt-1">Sinfxronizatsiya qilinmoqda...</p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6 z-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-red-500/5 border border-red-500/20 p-8 rounded-[32px] text-center max-w-sm w-full backdrop-blur-xl"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-white text-2xl font-black mb-3">Xatolik</h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            {error}
          </p>
          <button 
            onClick={() => router.back()}
            className="w-full h-14 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all active:scale-95"
          >
            Orqaga qaytish
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <main className="fixed inset-0 bg-black overflow-hidden select-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={item?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="w-full h-full"
        >
          <ModelViewer 
            modelUrl={item?.modelUrl || null} 
            itemName={item?.name || "Mahsulot"} 
            onClose={() => router.back()}
            restaurantSlug={restaurantSlug}
            primaryColor={primaryColor}
          />
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

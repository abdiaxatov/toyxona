import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  getDocs,
  orderBy,
  writeBatch,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore"
import { getRestaurantCollection, getRestaurantDoc } from "@/lib/firebase-utils"
import { AliPOSService, AliPOSConfig } from "@/lib/alipos-service"

export async function POST(request: NextRequest) {
  try {
    const { restaurantId } = await request.json()
    if (!restaurantId) throw new Error("restaurantId is required")

    const restaurantDoc = await getDoc(doc(db, "restaurants", restaurantId))
    if (!restaurantDoc.exists()) throw new Error("Restaurant not found")
    
    const restaurantData = restaurantDoc.data()
    const config: AliPOSConfig = restaurantData.integrations?.alipos
    if (!config || !config.clientId) throw new Error("AliPOS NOT configured")

    const service = new AliPOSService(config)
    const menu = await service.getMenu()

    const batch = writeBatch(db)
    
    // Get local categories and products to find duplicates
    const localCategoriesSnap = await getDocs(getRestaurantCollection(restaurantId, "categories"))
    const localProductsSnap = await getDocs(getRestaurantCollection(restaurantId, "menuItems"))
    
    const localCategories = localCategoriesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
    const localProducts = localProductsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

    const newCategoryMap = new Map<string, string>()

    // 1. Sync Categories
    for (const aliCat of menu.categories) {
      const existingCat = localCategories.find(c => c.aliposId === aliCat.id)
      if (existingCat) {
        batch.update(getRestaurantDoc(restaurantId, "categories", existingCat.id), {
          name: aliCat.name,
          name_uz: aliCat.name,
          order: aliCat.sortOrder,
          updatedAt: serverTimestamp()
        })
        newCategoryMap.set(aliCat.id, existingCat.id)
      } else {
        const newCatRef = doc(collection(db, "restaurants", restaurantId, "categories"))
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

    // Helper for robust image finding
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

    // 2. Sync Products
    for (const aliProd of menu.products) {
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
        category: aliProd.categoryId,
        order: aliProd.sortOrder,
        aliposId: aliProd.id,
        available: true,
        isAvailable: true,
        isAliPOS: true,
        updatedAt: serverTimestamp()
      }

      if (existingProd) {
        batch.update(getRestaurantDoc(restaurantId, "menuItems", existingProd.id), productData)
      } else {
        const newProdRef = doc(collection(db, "restaurants", restaurantId, "menuItems"))
        batch.set(newProdRef, {
          ...productData,
          createdAt: serverTimestamp()
        })
      }
    }

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Sync API Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, limit } from "firebase/firestore"
import { cache } from "react"

export interface RestaurantData {
    id: string
    [key: string]: any
}

export const getRestaurantBySlug = cache(async (slug: string): Promise<RestaurantData | null> => {
    const q = query(collection(db, "restaurants"), where("slug", "==", slug), limit(1))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
        // Development fallback for 'sumika' slug
        if (slug === "sumika") {
            const fallbackQ = query(collection(db, "restaurants"), where("__name__", "==", "v5K3bHKNpR0dab4jPb7U"), limit(1))
            const fallbackSnap = await getDocs(fallbackQ)
            if (!fallbackSnap.empty) {
                const doc = fallbackSnap.docs[0]
                const data = doc.data()
                return {
                    id: doc.id,
                    ...data,
                    status: (data.status === 'active' || data.status === 'disabled') ? 'active' : data.status,
                    createdAt: data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || null
                }
            }
        }
        return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || null
    }
})

export const getRestaurantByDomain = cache(async (domain: string): Promise<RestaurantData | null> => {
    // Remove port if present
    const cleanDomain = domain.split(':')[0].toLowerCase()

    // Ignore main domains (could be moved to config)
    const mainDomains = ["localhost", "menu.abdiaxatov.uz", "qrmenu-next.vercel.app", "abdiaxatov.uz", "vercel.app"]
    if (mainDomains.some(d => cleanDomain.includes(d))) {
        return null
    }

    // 1. Try exact match
    let q = query(collection(db, "restaurants"), where("customDomain", "==", cleanDomain), limit(1))
    let snapshot = await getDocs(q)

    // 2. If not found, try stripping 'www.'
    if (snapshot.empty && cleanDomain.startsWith("www.")) {
        const noWwwDomain = cleanDomain.replace(/^www\./, "")
        q = query(collection(db, "restaurants"), where("customDomain", "==", noWwwDomain), limit(1))
        snapshot = await getDocs(q)
    }

    // 3. If still not found, try adding 'www.'
    if (snapshot.empty && !cleanDomain.startsWith("www.")) {
        const wwwDomain = "www." + cleanDomain
        q = query(collection(db, "restaurants"), where("customDomain", "==", wwwDomain), limit(1))
        snapshot = await getDocs(q)
    }

    if (snapshot.empty) {
        return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || null
    }
})

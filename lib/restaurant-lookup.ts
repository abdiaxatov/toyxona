import { adminDb } from "@/lib/firebase-admin"
import { cache } from "react"

export interface RestaurantData {
    id: string
    [key: string]: any
}

export const getRestaurantBySlug = cache(async (slug: string): Promise<RestaurantData | null> => {
    if (!adminDb) return null
    const snapshot = await adminDb.collection("restaurants").where("slug", "==", slug).limit(1).get()

    if (snapshot.empty) {
        // Development fallback for 'sumika' slug
        if (slug === "sumika") {
            const fallbackSnap = await adminDb.collection("restaurants").where("__name__", "==", "v5K3bHKNpR0dab4jPb7U").limit(1).get()
            if (!fallbackSnap.empty) {
                const doc = fallbackSnap.docs[0]
                const data = doc.data()
                return {
                    id: doc.id,
                    ...data,
                    status: (data.status === 'active' || data.status === 'disabled') ? 'active' : data.status,
                    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt?._seconds ? data.createdAt._seconds * 1000 : null),
                    updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt?._seconds ? data.updatedAt._seconds * 1000 : null)
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
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt?._seconds ? data.createdAt._seconds * 1000 : null),
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt?._seconds ? data.updatedAt._seconds * 1000 : null)
    }
})

export const getRestaurantByDomain = cache(async (domain: string): Promise<RestaurantData | null> => {
    if (!adminDb) return null
    // Remove port if present
    const cleanDomain = domain.split(':')[0].toLowerCase()

    // Ignore main domains (could be moved to config)
    const mainDomains = ["localhost", "menu.abdiaxatov.uz", "qrmenu-next.vercel.app", "abdiaxatov.uz", "vercel.app"]
    if (mainDomains.some(d => cleanDomain.includes(d))) {
        return null
    }

    // 1. Try exact match
    let snapshot = await adminDb.collection("restaurants").where("customDomain", "==", cleanDomain).limit(1).get()

    // 2. If not found, try stripping 'www.'
    if (snapshot.empty && cleanDomain.startsWith("www.")) {
        const noWwwDomain = cleanDomain.replace(/^www\./, "")
        snapshot = await adminDb.collection("restaurants").where("customDomain", "==", noWwwDomain).limit(1).get()
    }

    // 3. If still not found, try adding 'www.'
    if (snapshot.empty && !cleanDomain.startsWith("www.")) {
        const wwwDomain = "www." + cleanDomain
        snapshot = await adminDb.collection("restaurants").where("customDomain", "==", wwwDomain).limit(1).get()
    }

    if (snapshot.empty) {
        return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt?._seconds ? data.createdAt._seconds * 1000 : null),
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt?._seconds ? data.updatedAt._seconds * 1000 : null)
    }
})

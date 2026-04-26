
import { MetadataRoute } from 'next'
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

export default async function manifest({ params }: { params: Promise<{ slug: string }> }): Promise<MetadataRoute.Manifest> {
    const { slug } = await params
    console.log("Generating manifest for slug:", slug)

    // Default manifest
    const defaultManifest: MetadataRoute.Manifest = {
        name: 'Menu - Online Restaurant',
        short_name: 'Menu',
        description: 'Buyurtma berish uchun zamonaviy restoran ilovasi',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }

    try {
        const q = query(collection(db, "restaurants"), where("slug", "==", slug))
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data()
            const name = data.name || "Restoran"
            const shortName = name.length > 20 ? name.substring(0, 20) : name
            const logo = data.logoUrl || '/icon-192.png'

            return {
                ...defaultManifest,
                name: name,
                short_name: shortName,
                description: data.slogan || `Online menu for ${name}`,
                start_url: `/${slug}`,
                // Use restaurant logo if available, otherwise fall back to default icons
                icons: data.logoUrl ? [
                    {
                        src: data.logoUrl,
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: data.logoUrl,
                        sizes: '384x384',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: data.logoUrl,
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    }
                ] : defaultManifest.icons,
                theme_color: data.primaryColor || '#000000',
            }
        }
    } catch (error) {
        console.error("Error generating manifest:", error)
    }

    return defaultManifest
}

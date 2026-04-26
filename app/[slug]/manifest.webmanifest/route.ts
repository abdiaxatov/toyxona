import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { NextResponse } from "next/server"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params

    // Default manifest
    const manifest = {
        name: 'Menu - Online Restaurant',
        short_name: 'Menu',
        description: 'Buyurtma berish uchun zamonaviy restoran ilovasi',
        start_url: `/${slug}`,
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

            manifest.name = name
            manifest.short_name = shortName
            manifest.description = data.slogan || `Online menu for ${name}`
            manifest.theme_color = data.primaryColor || '#000000'

            if (data.logoUrl) {
                manifest.icons = [
                    {
                        src: data.logoUrl,
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: data.logoUrl,
                        sizes: '384x384',
                        type: 'image/png',
                    },
                    {
                        src: data.logoUrl,
                        sizes: '512x512',
                        type: 'image/png',
                    }
                ]
            }
        }
    } catch (error) {
        console.error("Error generating manifest:", error)
    }

    return NextResponse.json(manifest, {
        headers: {
            'Content-Type': 'application/manifest+json',
        },
    })
}

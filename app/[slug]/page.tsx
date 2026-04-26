import { notFound } from "next/navigation"
import { MenuPage } from "@/components/menu-page"
import type { Metadata } from 'next'
import { getRestaurantBySlug } from "@/lib/restaurant-lookup"

interface PageProps {
    params: Promise<{ slug: string }>
}

// Generate metadata dynamically
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const restaurant = await getRestaurantBySlug(slug)

    if (!restaurant) {
        return {
            title: 'Sahifa topilmadi',
        }
    }

    const icons = restaurant.logoUrl ? {
        icon: [
            { url: restaurant.logoUrl, sizes: 'any' },
            { url: restaurant.logoUrl, type: 'image/png', sizes: '32x32' },
        ],
        apple: [
            { url: restaurant.logoUrl, sizes: '180x180' },
            { url: restaurant.logoUrl, sizes: '192x192' }
        ],
        shortcut: [
            { url: restaurant.logoUrl }
        ]
    } : undefined

    return {
        title: restaurant.seoTitle || restaurant.name || 'Menu',
        description: restaurant.seoDescription || `${restaurant.name} - Online Menyu`,
        openGraph: {
            title: restaurant.seoTitle || restaurant.name,
            description: restaurant.seoDescription || `${restaurant.name} - Online Menyu`,
            images: restaurant.bannerUrl ? [restaurant.bannerUrl] : [],
        },
        icons: icons,
        // Next.js handles manifest automatically via manifest.ts
        appleWebApp: {
            title: restaurant.name || "Restaurant App",
            statusBarStyle: "default",
            capable: true
        }
    }
}

export default async function RestaurantMenuPage({ params }: PageProps) {
    const { slug } = await params

    const restaurantData = await getRestaurantBySlug(slug)

    if (!restaurantData || restaurantData.status !== 'active') {
        notFound()
    }

    // Convert Firestore Timestamps and other non-serializable objects to plain values
    const serializedData = JSON.parse(JSON.stringify(restaurantData))

    return <MenuPage restaurantId={serializedData.id} restaurantData={serializedData} />
}

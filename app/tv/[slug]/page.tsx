import { notFound } from "next/navigation"
import { getRestaurantBySlug } from "@/lib/restaurant-lookup"
import type { Metadata } from 'next'
import { TvMenuContainer } from "@/components/tv/tv-menu-container"

interface PageProps {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const restaurant = await getRestaurantBySlug(slug)
    if (!restaurant) return { title: 'TV Menu - Topilmadi' }
    return {
        title: `${restaurant.name} — Asosiy TV Menyu`,
        description: "Raqamli menyu barcha ekranlar uchun",
        viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
    }
}

export default async function TvPage({ params }: PageProps) {
    const { slug } = await params
    const restaurantData = await getRestaurantBySlug(slug)
    if (!restaurantData) notFound()
    const serializedData = JSON.parse(JSON.stringify(restaurantData))
    return (
        <main className="fixed inset-0 bg-black overflow-hidden select-none">
            <TvMenuContainer
                restaurantId={serializedData.id}
                restaurantData={serializedData}
                screenId="main"
            />
        </main>
    )
}

import { headers } from "next/headers"
import { MenuPage } from "@/components/menu-page"
import { LandingPage } from "@/components/landing-page"
import { getRestaurantByDomain } from "@/lib/restaurant-lookup"
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const restaurant = await getRestaurantByDomain(host)

  if (restaurant) {
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
      appleWebApp: {
        title: restaurant.name || "Restaurant App",
        statusBarStyle: "default",
        capable: true
      }
    }
  }

  return {
    title: "FoodHub - Zamonaviy QR Menyu Tizimi",
    description: "Restoranlar uchun eng ilg'or raqamli menyu va buyurtma berish platformasi.",
  }
}

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const restaurantData = await getRestaurantByDomain(host)

  if (restaurantData) {
    const serializedData = JSON.parse(JSON.stringify(restaurantData))
    return <MenuPage restaurantId={serializedData.id} restaurantData={serializedData} />
  }

  // Fallback to FoodHub landing page
  return <LandingPage />
}

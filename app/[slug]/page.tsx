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

    if (!restaurantData || restaurantData.status === 'deleted') {
        notFound()
    }

    // Convert Firestore Timestamps and other non-serializable objects to plain values
    const serializedData = JSON.parse(JSON.stringify(restaurantData))

    // 🔹 Pre-fetch collections using Admin SDK to bypass security rules
    const [categoriesSnap, menuItemsSnap, bannersSnap] = await Promise.all([
        adminDb.collection("restaurants").doc(serializedData.id).collection("categories").orderBy("order").get(),
        adminDb.collection("restaurants").doc(serializedData.id).collection("menuItems").get(),
        adminDb.collection("restaurants").doc(serializedData.id).collection("banners").orderBy("createdAt", "desc").get()
    ]);

    const initialCategories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const initialMenuItems = menuItemsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Format dates
            discountEndsAt: data.discountEndsAt?.toMillis ? data.discountEndsAt.toMillis() : (data.discountEndsAt?._seconds ? data.discountEndsAt._seconds * 1000 : null),
        };
    }).filter(item => item.available !== false && item.isAvailable !== false);

    const initialBanners = bannersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(b => b.active);

    return (
        <MenuPage 
            restaurantId={serializedData.id} 
            restaurantData={serializedData} 
            initialCategories={JSON.parse(JSON.stringify(initialCategories))}
            initialMenuItems={JSON.parse(JSON.stringify(initialMenuItems))}
            initialBanners={JSON.parse(JSON.stringify(initialBanners))}
        />
    )
}

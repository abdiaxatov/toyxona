import { adminDb } from "@/lib/firebase-admin"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const ordersSnapshot = await adminDb.collection("orders").orderBy("createdAt", "desc").limit(10).get()
        const recentOrders: any[] = []
        ordersSnapshot.forEach(doc => recentOrders.push({ id: doc.id, ...doc.data() }))
        
        // Also check restaurants/{id}/orders
        const restaurantsSnapshot = await adminDb.collection("restaurants").get()
        for (const rest of restaurantsSnapshot.docs) {
            const restOrders = await rest.ref.collection("orders").orderBy("createdAt", "desc").limit(5).get()
            restOrders.forEach(doc => recentOrders.push({ id: doc.id, restaurantId: rest.id, ...doc.data() }))
        }

        // Sort all by createdAt
        recentOrders.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)
            return timeB - timeA
        })

        // Get all products from root for debugging
        const rootItemsSnapshot = await adminDb.collection("menuItems").get()
        const rootItems = rootItemsSnapshot.docs.map(doc => ({
           id: doc.id,
           name: doc.data().name,
           aliposId: doc.data().aliposId || null
        }))

        // Get all products from all restaurants for debugging
        const restaurantItems: any[] = []
        for (const res of restaurantsSnapshot.docs) {
           const itemsSnapshot = await res.ref.collection("menuItems").get()
           itemsSnapshot.forEach(doc => {
              restaurantItems.push({
                 restaurantId: res.id,
                 id: doc.id,
                 name: doc.data().name,
                 aliposId: doc.data().aliposId || null
              })
           })
        }

        return NextResponse.json({
            success: true,
            recentOrders: recentOrders.slice(0, 10).map(o => ({
                id: o.id,
                aliposSynced: o.aliposSynced || false,
                aliposError: o.aliposError || null,
                createdAt: o.createdAt,
                items: o.items || []
            })),
            rootItems,
            restaurantItems
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}

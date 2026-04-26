import { headers } from "next/headers"
import { getRestaurantByDomain } from "@/lib/restaurant-lookup"
import { CartPage } from "@/components/cart-page"

export default async function Cart({ 
  searchParams 
}: { 
  searchParams: Promise<{ restaurantId?: string }> 
}) {
  const { restaurantId: paramId } = await searchParams
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const restaurant = await getRestaurantByDomain(host)
  
  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Restoran topilmadi</h1>
        <p className="text-muted-foreground">Iltimos, manzilni tekshiring yoki asosiy sahifaga qayting.</p>
        <a href="/" className="mt-4 text-primary hover:underline">Asosiy sahifa</a>
      </div>
    )
  }

  return <CartPage 
    restaurantId={paramId || restaurant?.id} 
    slug={restaurant?.slug}
    customDomain={restaurant?.customDomain}
  />
}

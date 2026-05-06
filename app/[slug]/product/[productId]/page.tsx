import { getRestaurantBySlug } from "@/lib/restaurant-lookup"
import { notFound } from "next/navigation"
import { ProductClient } from "./product-client"
import { adminDb } from "@/lib/firebase-admin"

interface PageProps {
  params: {
    slug: string
    productId: string
  }
}

export default async function ProductPage({ params }: PageProps) {
  const resolvedParams = await params;
  const restaurant = await getRestaurantBySlug(resolvedParams.slug)
  
  if (!restaurant) {
    notFound()
  }

  const productDoc = await adminDb
    .collection("restaurants")
    .doc(restaurant.id)
    .collection("menuItems")
    .doc(resolvedParams.productId)
    .get()
  
  if (!productDoc.exists) {
    notFound()
  }
  
  const productData = productDoc.data()
  const product = { 
    id: productDoc.id, 
    ...productData,
    createdAt: productData.createdAt?.toMillis ? productData.createdAt.toMillis() : (productData.createdAt?._seconds ? productData.createdAt._seconds * 1000 : null),
    updatedAt: productData.updatedAt?.toMillis ? productData.updatedAt.toMillis() : (productData.updatedAt?._seconds ? productData.updatedAt._seconds * 1000 : null)
  }

  // Ensure variants exist
  if (!product.variants || product.variants.length === 0) {
    // If no variants, just redirect back to the menu
    // Actually we can just show the product itself, but for now just pass to client
  }

  return <ProductClient restaurant={restaurant} product={product} slug={resolvedParams.slug} />
}
